import type { Connections, NotificationParams } from 'definitions'

import { mail } from './mail'
import { Notice } from './notice'

export class NotificationService {
  public mail: typeof mail
  public notice: Notice
  private connections: Connections

  public constructor(connections: Connections) {
    this.connections = connections
    this.mail = mail
    this.notice = new Notice(connections)
  }

  public trigger = async (params: NotificationParams) =>
    this.notice.trigger(params)

  public markAllNoticesAsRead = async (userId: string) => {
    const knex = this.connections.knex
    return knex('notice')
      .where({ recipientId: userId, unread: true })
      .update({ unread: false })
  }
}
