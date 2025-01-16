import type { ArticleVersion, Connections } from 'definitions'

import { getLogger } from 'common/logger'
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
      data: { name, description, providerId, enabled },
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
    const existingChannelIds = new Set(existingChannels.map((c) => c.channelId))

    // Diff channels
    const toAdd = channelIds.filter((id) => !existingChannelIds.has(id))
    const toRemove = [...existingChannelIds].filter(
      (id) => !channelIds.includes(id)
    )

    // Add new channels
    if (toAdd.length > 0) {
      for (const channelId of toAdd) {
        await this.models.create({
          table: 'article_channel',
          data: {
            articleId,
            channelId,
            enabled: true,
            isLabeled: true,
          },
        })
      }
    }

    // Disable removed channels
    if (toRemove.length > 0) {
      await this.models.updateMany({
        table: 'article_channel',
        where: { articleId },
        whereIn: ['channelId', toRemove],
        data: { enabled: false, isLabeled: true },
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
        id: content.id,
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
      summary ? title + '\n' + summary + '\n' + content : title + '\n' + content
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
        await this.models.create({
          table: 'article_channel_job',
          data: { articleId: article.id, jobId, state },
        })
        return { state, jobId }
      })
    )
    return results
  }
}
