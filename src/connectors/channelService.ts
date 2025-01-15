import type { Connections } from 'definitions'

import { ARTICLE_CHANNEL_JOB_STATE, QUEUE_URL } from 'common/enums'
import { getLogger } from 'common/logger'
import { ArticleService, AtomService, aws, ChannelClassifier } from 'connectors'
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

  public classifyArticleChannels = async ({
    id,
    classifier,
  }: {
    id: string
    classifier?: ChannelClassifier
  }) => {
    const articleService = new ArticleService(this.connections)
    const channelClassifier = classifier ?? new ChannelClassifier()
    const { title, summary, summaryCustomized } =
      await articleService.loadLatestArticleVersion(id)
    const content = await articleService.loadLatestArticleContent(id)

    await this._classifyArticleChannels(
      {
        id,
        title,
        content,
        summary: summaryCustomized ? summary : undefined,
      },
      channelClassifier
    )
  }

  private _classifyArticleChannels = async (
    {
      id,
      title,
      content,
      summary,
    }: { id: string; title: string; content: string; summary?: string },
    classifier: ChannelClassifier
  ) => {
    const channelClassifier = classifier ?? new ChannelClassifier()
    const text = summary
      ? title + '\n' + summary + '\n' + content
      : title + '\n' + content
    const result = await channelClassifier.classify(text)

    if (result) {
      const { state, jobId } = result
      logger.info(`Channel classification for article ${id}: ${state} ${jobId}`)
      await this.models.create({
        table: 'article_channel_job',
        data: { articleId: id, jobId, state },
      })

      if (state === ARTICLE_CHANNEL_JOB_STATE.processing) {
        await aws.sqsSendMessage({
          messageBody: { articleId: id, jobId },
          queueUrl: QUEUE_URL.channelClassifier,
        })
      }

      return result
    }
  }
}
