import { v4 } from 'uuid'
import { isEqual, difference } from 'lodash'
import DataLoader from 'dataloader'
import pMap from 'p-map'

import {
  User,
  NotificationEntity,
  PutNoticeParams,
  NoticeUserId,
  NoticeEntity,
  NoticeDetail,
  NoticeEntitiesMap,
  NoticeItem
} from 'definitions'
import { BaseService } from '../baseService'
import { BATCH_SIZE } from 'common/enums'
import logger from 'common/logger'

class Notice extends BaseService {
  constructor() {
    super('notice')
    this.dataloader = new DataLoader(this.findByIds)
  }

  /**
   * Create a notice item
   */
  async create({
    type,
    actorIds,
    recipientId,
    entities,
    message,
    data
  }: PutNoticeParams): Promise<void> {
    await this.knex.transaction(async trx => {
      // create notice detail
      const [{ id: noticeDetailId }] = await trx
        .insert({
          noticeType: type,
          message,
          data
        })
        .into('notice_detail')
        .returning('*')
      logger.info(`Inserted id ${noticeDetailId} to notice_detail`)

      // create notice
      const [{ id: noticeId }] = await trx
        .insert({
          uuid: v4(),
          noticeDetailId,
          recipientId
        })
        .into('notice')
        .returning('*')
      logger.info(`Inserted id ${noticeId} to notice`)

      // create notice actorIds
      if (actorIds) {
        await pMap(actorIds, async actorId => {
          const [{ id: noticeActorId }] = await trx
            .insert({
              noticeId,
              actorId
            })
            .into('notice_actor')
            .returning('*')
          logger.info(`Inserted id ${noticeActorId} to notice_actor`)
        })
      }

      // craete notice entities
      if (entities) {
        await pMap(
          entities,
          async ({ type, entityTable, entity }: NotificationEntity) => {
            const { id: entityTypeId } = await trx
              .select('id')
              .from('entity_type')
              .where({ table: entityTable })
              .first()
            const [{ id: noticeEntityId }] = await trx
              .insert({
                type,
                entityTypeId,
                entityId: entity.id,
                noticeId
              })
              .into('notice_entity')
              .returning('*')
            logger.info(`Inserted id ${noticeEntityId} to notice_entity`)
          }
        )
      }
    })
  }

  /**
   * Bundle with existing notice
   */
  async addNoticeActors({
    noticeId,
    actorIds
  }: {
    noticeId: string
    actorIds: NoticeUserId[]
  }): Promise<void> {
    await this.knex.transaction(async trx => {
      // add actors
      await pMap(actorIds, async actorId => {
        const [{ id: noticeActorId }] = await trx
          .insert({
            noticeId,
            actorId
          })
          .into('notice_actor')
          .returning('*')
        logger.info(
          `[addNoticeActors] Inserted id ${noticeActorId} to notice_actor`
        )
      })

      // update notice
      await trx('notice')
        .where({ id: noticeId })
        .update({ unread: true, updatedAt: new Date() })
      logger.info(`[addNoticeActors] Updated id ${noticeId} in notice`)
    })
  }

  /**
   * Process new event to determine
   * whether to bundle with old notice or write new notice
   */
  process = async (
    params: PutNoticeParams
  ): Promise<{ created: boolean; bundled: boolean }> => {
    // create
    const bundleableNoticeId = await this.getBundleableNoticeId(params)
    if (!bundleableNoticeId) {
      await this.create(params)
      return { created: true, bundled: false }
    }

    // do nothing
    const bundleActorIds = await this.getBundleActorIds({
      noticeId: bundleableNoticeId,
      actorIds: params.actorIds || []
    })

    if (!bundleActorIds || bundleActorIds.length <= 0) {
      return { created: false, bundled: false }
    }

    // bundle
    await this.addNoticeActors({
      noticeId: bundleableNoticeId,
      actorIds: bundleActorIds
    })
    return { created: false, bundled: true }
  }

  getBundleActorIds = async ({
    noticeId,
    actorIds
  }: {
    noticeId: string
    actorIds: NoticeUserId[]
  }): Promise<NoticeUserId[]> => {
    const sourceActors = await this.knex
      .select('actorId')
      .where({ noticeId })
      .whereIn('actorId', actorIds)
      .from('notice_actor')
    const sourceActorIds = sourceActors.map(
      ({ actorId }: { actorId: NoticeUserId }) => actorId
    )
    return difference(actorIds, sourceActorIds)
  }

  /**
   * Get a bundleable notice
   *
   */
  getBundleableNoticeId = async ({
    type,
    actorIds,
    recipientId,
    entities,
    message = null,
    data = null
  }: PutNoticeParams): Promise<string | undefined> => {
    // only notice with actors can be bundled
    if (!actorIds || actorIds.length <= 0) {
      return
    }

    // filter with type, unread, deleted, recipientId and message
    const notices = await this.findDetail({
      where: {
        noticeType: type,
        unread: true,
        deleted: false,
        recipientId,
        message
      }
    })

    for (const [index, notice] of notices.entries()) {
      // compare notice data
      if (!isEqual(notice.data, data)) {
        return
      }
      const targetEntities = (await this.findEntities(
        notice.id,
        false
      )) as NoticeEntity[]
      // Check if entities exist
      const isTargetEntitiesExists = targetEntities && targetEntities.length > 0
      const isSourceEntitiesExists = entities && entities.length > 0
      if (!isTargetEntitiesExists || !isSourceEntitiesExists) {
        return notice.id
      }
      if (
        (isTargetEntitiesExists && !isSourceEntitiesExists) ||
        (!isTargetEntitiesExists && isSourceEntitiesExists)
      ) {
        return
      }

      // compare notice entities
      let targetEntitiesHashMap: any = {}
      let sourceEntitiesHashMap: any = {}
      targetEntities.forEach(({ type, table, entityId }) => {
        const hash = `${type}:${table}:${entityId}`
        targetEntitiesHashMap[hash] = true
      })
      ;(entities || []).forEach(({ type, entityTable, entity }) => {
        const hash = `${type}:${entityTable}:${entity.id}`
        sourceEntitiesHashMap[hash] = true
      })
      if (isEqual(targetEntitiesHashMap, sourceEntitiesHashMap)) {
        return notice.id
      }

      return
    }

    return
  }

  /**
   * Find notices with detail
   */
  findDetail = async ({
    where,
    whereIn,
    offset,
    limit
  }: {
    where?: { [key: string]: any }
    whereIn?: [string, any[]]
    offset?: number
    limit?: number
  }): Promise<NoticeDetail[]> => {
    let query = this.knex
      .select([
        'notice.id',
        'notice.uuid',
        'notice.unread',
        'notice.deleted',
        'notice.updated_at',
        'notice_detail.notice_type',
        'notice_detail.message',
        'notice_detail.data'
      ])
      .from('notice')
      .innerJoin(
        'notice_detail',
        'notice.notice_detail_id',
        '=',
        'notice_detail.id'
      )
      .orderBy('updated_at', 'desc')

    if (where) {
      query = query.where(where)
    }

    if (whereIn) {
      const [col, arr] = whereIn
      query = query.whereIn(col, arr)
    }

    if (offset) {
      query = query.offset(offset)
    }

    if (limit) {
      query = query.limit(limit)
    }

    const result = await query

    return result
  }

  /**
   * Find notice entities by a given notice id
   */
  findEntities = async (
    noticeId: string,
    expand: boolean = true
  ): Promise<NoticeEntity[] | NoticeEntitiesMap> => {
    const entities = await this.knex
      .select([
        'notice_entity.type',
        'notice_entity.entity_id',
        'entity_type.table'
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
      entities.forEach(async ({ type, entityId, table }: any) => {
        const entity = await this.knex
          .select()
          .from(table)
          .where({ id: entityId })
          .first()

        _entities[type] = entity
      })
      return _entities
    }

    return entities
  }

  /**
   * Find notice actors by a given notice id
   */
  findActors = async (noticeId: string): Promise<User[]> => {
    const actors = await this.knex
      .select('user.*')
      .from('notice_actor')
      .innerJoin('user', 'notice_actor.actor_id', '=', 'user.id')
      .where({ noticeId })
    return actors
  }

  /**
   * Find notices by given ids.
   */
  findByIds = async (ids: string[]): Promise<NoticeItem[]> => {
    const notices = await this.findDetail({
      whereIn: ['notice.id', ids]
    })

    return pMap(notices, async (notice: NoticeDetail) => {
      const entities = (await this.findEntities(notice.id)) as NoticeEntitiesMap
      const actors = await this.findActors(notice.id)

      return {
        ...notice,
        createdAt: notice.updatedAt,
        type: notice.noticeType,
        actors,
        entities
      }
    })
  }

  /*********************************
   *                               *
   *           By User             *
   *                               *
   *********************************/
  findByUser = async ({
    userId,
    limit = BATCH_SIZE,
    offset = 0
  }: {
    userId: string
    limit?: number
    offset?: number
  }): Promise<NoticeItem[]> => {
    const notices = await this.findDetail({
      where: { recipientId: userId, deleted: false },
      offset,
      limit
    })

    return pMap(notices, async (notice: NoticeDetail) => {
      const entities = (await this.findEntities(notice.id)) as NoticeEntitiesMap
      const actors = await this.findActors(notice.id)

      return {
        ...notice,
        createdAt: notice.updatedAt,
        type: notice.noticeType,
        actors,
        entities
      }
    })
  }

  markAllNoticesAsRead = async (userId: string): Promise<any> =>
    this.knex('notice')
      .where({ recipientId: userId, unread: true })
      .update({ unread: false })

  countNotice = async ({
    userId,
    unread
  }: {
    userId: string
    unread?: boolean
  }): Promise<number> => {
    let qs = this.knex('notice')
      .where({ recipientId: userId, deleted: false })
      .count()
      .first()

    if (unread) {
      qs = qs.where({ unread: true })
    }

    const result = await qs
    return parseInt(result.count, 10)
  }
}

export const notice = new Notice()
