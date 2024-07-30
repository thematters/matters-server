import type {
  Connections,
  NotificationParams,
  NoticeItem,
  NoticeDetail,
  NoticeEntitiesMap,
  NoticeEntity,
  User,
} from 'definitions'

import { MONTH, NOTICE_TYPE, QUEUE_URL, CACHE_TTL } from 'common/enums'
import { isTest } from 'common/environment'
import { getLogger } from 'common/logger'
import { aws } from 'connectors'

import { mail } from './mail'

const logger = getLogger('service-notification')

const SKIP_NOTICE_FLAG_PREFIX = 'skip-notice'

export class NotificationService {
  public mail: typeof mail
  private connections: Connections
  private aws: typeof aws

  public constructor(connections: Connections) {
    this.connections = connections
    this.mail = mail
    this.aws = aws
  }

  public trigger = async (params: NotificationParams) => {
    if (isTest) {
      return
    }
    logger.info(`triggered notification params: ${JSON.stringify(params)}`)

    if ('tag' in params) {
      params.tag = `${SKIP_NOTICE_FLAG_PREFIX}:${params.tag}`
      // delete skip flag when sending this notice again
      await this.connections.redis.del(params.tag)
    }
    try {
      await this.aws.sqsSendMessage({
        messageBody: params,
        queueUrl: QUEUE_URL.notification,
      })
    } catch (error) {
      logger.error(error)
    }
  }

  /**
   * Mark a notice tag to be skipped.
   *
   * In Lambda, we will check if a flag exists for a given tag,
   * if so, we will skip processing this notice with the tag.
   */
  public cancel = async (tag: string) =>
    this.connections.redis.set(
      `${SKIP_NOTICE_FLAG_PREFIX}:${tag}`,
      '1',
      'EX',
      CACHE_TTL.NOTICE
    )

  public markAllNoticesAsRead = async (userId: string) => {
    const knex = this.connections.knex
    return knex('notice')
      .where({ recipientId: userId, unread: true })
      .update({ unread: false })
  }

  public findByUser = async ({
    userId,
    onlyRecent,
    take,
    skip,
  }: {
    userId: string
    onlyRecent?: boolean
    take?: number
    skip?: number
  }): Promise<NoticeItem[]> => {
    const where = [[{ recipientId: userId, deleted: false }]] as any[][]
    if (onlyRecent) {
      where.push(['notice.updated_at', '>', new Date(Date.now() - 6 * MONTH)])
    }

    const notices = await this.findDetail({
      where,
      skip,
      take,
    })

    return Promise.all(
      notices.map(async (n: NoticeDetail) => {
        const entities = (await this.findEntities(n.id)) as NoticeEntitiesMap
        const actors = await this.findActors(n.id)

        return {
          ...n,
          createdAt: n.updatedAt,
          type: n.noticeType,
          actors,
          entities,
        }
      })
    )
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

  /**
   * Find notices with detail
   */
  private findDetail = async ({
    where,
    whereIn,
    skip,
    take,
  }: {
    where?: any[][]
    whereIn?: [string, any[]]
    skip?: number
    take?: number
  }): Promise<NoticeDetail[]> => {
    const knexRO = this.connections.knexRO
    const query = knexRO
      .select([
        'notice.id',
        'notice.unread',
        'notice.deleted',
        'notice.updated_at',
        'notice_detail.notice_type',
        'notice_detail.message',
        'notice_detail.data',
      ])
      .from('notice')
      .innerJoin(
        'notice_detail',
        'notice.notice_detail_id',
        '=',
        'notice_detail.id'
      )
      .orderBy('updated_at', 'desc')
      .whereIn('notice_detail.notice_type', Object.values(NOTICE_TYPE))

    if (where) {
      where.forEach((w) => {
        query.where(w[0], w[1], w[2])
      })
    }

    if (whereIn) {
      query.whereIn(...whereIn)
    }

    if (skip) {
      query.offset(skip)
    }

    if (take || take === 0) {
      query.limit(take)
    }

    const result = await query

    return result
  }

  /**
   * Find notice entities by a given notice id
   */
  private findEntities = async (
    noticeId: string,
    expand = true
  ): Promise<NoticeEntity[] | NoticeEntitiesMap> => {
    const knexRO = this.connections.knex
    const entities = await knexRO
      .select([
        'notice_entity.type',
        'notice_entity.entity_id',
        'entity_type.table',
      ])
      .from('notice_entity')
      .innerJoin(
        'entity_type',
        'entity_type.id',
        '=',
        'notice_entity.entity_type_id'
      )
      .where({ noticeId })

    if (expand) {
      const _entities = {} as any

      await Promise.all(
        entities.map(async ({ type, entityId, table }: any) => {
          const entity = await knexRO
            .select()
            .from(table)
            .where({ id: entityId })
            .first()

          _entities[type] = entity
        })
      )

      return _entities
    }
    return entities
  }

  /**
   * Find notice actors by a given notice id
   */
  private findActors = async (
    noticeId: string
  ): Promise<Array<User & { noticeActorCreatedAt: string }>> => {
    const knexRO = this.connections.knexRO
    const actors = await knexRO
      .select('user.*', 'notice_actor.created_at as noticeActorCreatedAt')
      .from('notice_actor')
      .innerJoin('user', 'notice_actor.actor_id', '=', 'user.id')
      .where({ noticeId })
    return actors
  }
}
