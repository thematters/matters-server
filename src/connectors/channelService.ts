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
    enabled: boolean
  }) =>
    this.models.upsert({
      table: 'channel',
      where: { id },
      create: { id, name, description, providerId, enabled },
      update: { name, description, enabled, updatedAt: new Date() },
    })
}
