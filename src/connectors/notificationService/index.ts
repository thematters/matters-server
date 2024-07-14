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

  public countNotice = async ({
    userId,
    unread,
    onlyRecent,
  }: {
    userId: string
    unread?: boolean
    onlyRecent?: boolean
  }) => {
    const knexRO = this.connections.knexRO
    const query = knexRO('notice')
      .where({ recipientId: userId, deleted: false })
      .count()
      .first()

    if (unread) {
      query.where({ unread: true })
    }

    if (onlyRecent) {
      query.whereRaw(`updated_at > now() - interval '6 months'`)
    }

    const result = await query
    return parseInt(result ? (result.count as string) : '0', 10)
  }
}
