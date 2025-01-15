import type { Connections } from 'definitions'

import { AtomService } from 'connectors'

export class ChannelService {
  // private connections: Connections
  private models: AtomService

  public constructor(connections: Connections) {
    // this.connections = connections
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
}
