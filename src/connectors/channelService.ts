import type { ArticleVersion, Connections } from 'definitions'

import { ARTICLE_CHANNEL_JOB_STATE } from 'common/enums'
import { getLogger } from 'common/logger'
import { shortHash } from 'common/utils/nanoid'
import { ArticleService, AtomService, ChannelClassifier } from 'connectors'
const logger = getLogger('service-channel')

export class ChannelService {
  private connections: Connections
  private models: AtomService

  public constructor(connections: Connections) {
    this.connections = connections
    this.models = new AtomService(connections)
  }

  public updateOrCreateChannel = async ({
    id,
    name,
    description,
    providerId,
    enabled,
  }: {
    id?: string
    name: string
    description?: string
    providerId: string
    enabled?: boolean
  }) => {
    // update
    if (id) {
      return this.models.update({
        table: 'channel',
        where: { id },
        data: { name, description, providerId, enabled, updatedAt: new Date() },
      })
    }

    return this.models.create({
      table: 'channel',
      data: { shortHash: shortHash(), name, description, providerId, enabled },
    })
  }

  public setArticleChannels = async ({
    articleId,
    channelIds,
  }: {
    articleId: string
    channelIds: string[]
  }) => {
    // Get existing channels
    const existingChannels = await this.models.findMany({
      table: 'article_channel',
      where: { articleId },
    })

    // Track id, enabled status, and isByModel status
    const existingChannelMap = new Map(
      existingChannels.map((c) => [
        c.channelId,
        { enabled: c.enabled, isByModel: c.isByModel },
      ])
    )

    // Diff channels
    const toAdd = channelIds.filter(
      (id) =>
        !existingChannelMap.has(id) ||
        existingChannelMap.get(id)?.enabled === false
    )
    const toRemove = [...existingChannelMap.entries()]
      .filter(([id, { enabled }]) => enabled && !channelIds.includes(id))
      .map(([id]) => id)

    // Add new channels or re-enable disabled ones
    if (toAdd.length > 0) {
      await this.models.upsertOnConflict({
        table: 'article_channel',
        data: toAdd.map((channelId) => {
          const existing = existingChannelMap.get(channelId)
          return {
            articleId,
            channelId,
            enabled: true,
            isLabeled: true,
            // Only set isByModel to false if it's a new channel or not already true
            ...((!existing || !existing.isByModel) && { isByModel: false }),
          }
        }),
        onConflict: ['articleId', 'channelId'],
      })
    }

    // Disable removed channels
    if (toRemove.length > 0) {
      await this.models.updateMany({
        table: 'article_channel',
        where: { articleId },
        whereIn: ['channelId', toRemove],
        data: { enabled: false, isLabeled: true, updatedAt: new Date() },
      })
    }
  }

  public classifyArticlesChannels = async ({
    ids,
    classifier,
  }: {
    ids: string[]
    classifier?: ChannelClassifier
  }) => {
    const articleService = new ArticleService(this.connections)
    const channelClassifier = classifier ?? new ChannelClassifier()

    const articleVersions = (await articleService.loadLatestArticlesVersion(
      ids
    )) as ArticleVersion[]
    const contentIds = articleVersions.map(({ contentId }) => contentId)
    const contents = await articleService.loadLatestArticlesContentByContentIds(
      contentIds
    )

    await this._classifyArticlesChannels(
      contents.map((content, index) => ({
        id: ids[index],
        title: articleVersions[index].title || '',
        content: content.content || '',
        summary: articleVersions[index].summaryCustomized
          ? articleVersions[index].summary
          : undefined,
      })),
      channelClassifier
    )
  }

  private _classifyArticlesChannels = async (
    articles: Array<{
      id: string
      title: string
      content: string
      summary?: string
    }>,
    classifier: ChannelClassifier
  ) => {
    const channelClassifier = classifier ?? new ChannelClassifier()
    const texts = articles.map(({ title, summary, content }) =>
      summary ? `${title}\n${summary}\n${content}` : `${title}\n${content}`
    )
    const result = await channelClassifier.classify(texts)

    if (!result) {
      return
    }

    const results = await Promise.all(
      result.map(async ({ state, jobId }, index) => {
        const article = articles[index]
        logger.info(
          `Channel classification for article ${article.id}: ${state} ${jobId}`
        )
        await this.models.upsertOnConflict({
          table: 'article_channel_job',
          data: {
            articleId: article.id,
            jobId,
            // force into processing state and update result from Lambda
            state: ARTICLE_CHANNEL_JOB_STATE.processing,
          },
          onConflict: ['articleId', 'jobId'],
        })
        return { state, jobId }
      })
    )
    return results
  }
}
