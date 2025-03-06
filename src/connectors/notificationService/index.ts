import type {
  Connections,
  NotificationParams,
  NoticeItem,
  NoticeDetail,
  NoticeEntitiesMap,
  NoticeEntity,
  User,
} from 'definitions/index.js'

import { MONTH, NOTICE_TYPE, QUEUE_URL, CACHE_TTL } from 'common/enums/index.js'
import { isTest } from 'common/environment.js'
import { getLogger } from 'common/logger.js'
import { aws, AtomService } from 'connectors/index.js'

import { mail } from './mail/index.js'

const logger = getLogger('service-notification')

const SKIP_NOTICE_FLAG_PREFIX = 'skip-notice'
const DELETE_NOTICE_KEY_PREFIX = 'delete-notice'
const LOCK_NOTICE_PREFIX = 'lock-notice'

export class NotificationService {
  public mail: typeof mail
  private connections: Connections
  private aws: typeof aws
  private models: AtomService

  public constructor(connections: Connections) {
    this.connections = connections
    this.mail = mail
    this.aws = aws
    this.models = new AtomService(this.connections)
  }

  public trigger = async (params: NotificationParams) => {
    if (isTest) {
      return
    }
    logger.info(`triggered notification params: ${JSON.stringify(params)}`)

    if ('tag' in params) {
      // delete skip flag when sending this notice again
      await this.connections.redis.del(
        `${SKIP_NOTICE_FLAG_PREFIX}:${params.tag}`
      )
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
   * Mark a notice tag for skipping processing in Lambda function;
   * And delete all recently sent notices recorded by Lambda
   */
  public withdraw = async (tag: string) => {
    const redis = this.connections.redis
    // wait for lambda to finish state mutation
    while (await redis.get(`${LOCK_NOTICE_PREFIX}:${tag}`)) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    // set skip flag for this tag
    await redis.set(
      `${SKIP_NOTICE_FLAG_PREFIX}:${tag}`,
      '1',
      'EX',
      CACHE_TTL.NOTICE
    )
    // delete all recently sent notices of this tag
    const deleteKey = `${DELETE_NOTICE_KEY_PREFIX}:${tag}`
    const noticeIds = await redis.smembers(deleteKey)
    await Promise.all(noticeIds.map((id: string) => this.deleteNotice(id)))
    await redis.del(deleteKey)
  }

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

  private deleteNotice = async (id: string) =>
    this.models.update({
      table: 'notice',
      where: { id },
      data: { deleted: true },
    })
}
