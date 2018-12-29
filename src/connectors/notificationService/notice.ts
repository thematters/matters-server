import { v4 } from 'uuid'
import { isEqual, difference } from 'lodash'

import {
  NoticeType,
  NoticeEntity,
  NoticeEntityType,
  TableName
} from 'definitions'
import { BATCH_SIZE } from 'common/enums'
import { BaseService } from '../baseService'

export type NoticeUserId = string
export type NoticeMessage = string
export type NoticeData = {
  url?: string
  reason?: string
}
export type PutNoticeParams = {
  type: NoticeType
  actorIds?: NoticeUserId[]
  recipientId: NoticeUserId
  entities?: NoticeEntity[]
  message?: NoticeMessage | null
  data?: NoticeData | null
}

class NoticeService extends BaseService {
  constructor() {
    super('noop')
  }

  /**
   * Create a notice item
   */
  create({
    type,
    actorIds,
    recipientId,
    entities,
    message,
    data
  }: PutNoticeParams): void {
    this.knex.transaction(async trx => {
      // create notice detail
      const [{ id: noticeDetailId }] = await trx
        .insert({
          noticeType: type,
          message,
          data
        })
        .into('notice_detail')
        .returning('*')

      // create notice
      const [{ id: noticeId }] = await trx
        .insert({
          uuid: v4(),
          noticeDetailId,
          recipientId
        })
        .into('notice')
        .returning('*')

      // create notice actorIds
      if (actorIds) {
        await Promise.all(
          actorIds.map(async actorId => {
            await trx
              .insert({
                noticeId,
                actorId
              })
              .into('notice_actor')
          })
        )
      }

      // craete notice entities
      if (entities) {
        await Promise.all(
          entities.map(async ({ type, entityTable, entity }: NoticeEntity) => {
            const { id: entityTypeId } = await trx
              .select('id')
              .from('entity_type')
              .where({ table: entityTable })
              .first()
            await trx
              .insert({
                type,
                entityTypeId,
                entityId: entity.id,
                noticeId
              })
              .into('notice_entity')
          })
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
    this.knex.transaction(async trx => {
      // add actors
      await Promise.all(
        actorIds.map(async actorId => {
          await trx
            .insert({
              noticeId,
              actorId
            })
            .into('notice_actor')
        })
      )

      // update notice
      await trx('notice')
        .where({ id: noticeId })
        .update({ unread: true, updatedAt: new Date() })
    })
  }

  /**
   * Process new event to determine
   * whether to bundle with old notice or write new notice
   */
  async process(
    params: PutNoticeParams
  ): Promise<{ created: boolean; bundled: boolean }> {
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

  async getBundleActorIds({
    noticeId,
    actorIds
  }: {
    noticeId: string
    actorIds: NoticeUserId[]
  }): Promise<NoticeUserId[]> {
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
  async getBundleableNoticeId({
    type,
    actorIds,
    recipientId,
    entities,
    message = null,
    data = null
  }: PutNoticeParams) {
    // only notice with actors can be bundled
    if (!actorIds || actorIds.length <= 0) {
      return
    }

    // filter with type, unread, deleted, recipientId and message
    const notices = await this.findNoticesWithDetail({
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
      const targetEntities = await this.findEntitiesByNoticeId(notice.id, false)
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
  findNoticesWithDetail({
    where,
    offset,
    limit
  }: {
    where: { [key: string]: any }
    offset?: number
    limit?: number
  }) {
    let result = this.knex
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
      .where(where)
      .orderBy('updated_at', 'desc')

    if (offset) {
      result = result.offset(offset)
    }

    if (limit) {
      result = result.limit(limit)
    }

    return result
  }

  /**
   * Find notice entities by a given notice id
   */
  async findEntitiesByNoticeId(
    noticeId: string,
    expand: boolean = true
  ): Promise<{ type: NoticeEntityType; entityId: string; table: TableName }[]> {
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
  findActorsByNoticeId(noticeId: string) {
    return this.knex
      .select('user.*')
      .from('notice_actor')
      .innerJoin('user', 'notice_actor.actor_id', '=', 'user.id')
      .where({ noticeId })
  }

  /**
   * Find a notice by a given notice id
   */
  async findNoticeById(noticeId: string) {
    const [notice] = await this.findNoticesWithDetail({
      where: { noticeId }
    })

    if (!notice) {
      return
    }

    const entities = await this.findEntitiesByNoticeId(notice.id)
    const actors = await this.findActorsByNoticeId(notice.id)

    return {
      ...notice,
      createdAt: notice.updatedAt,
      type: notice.noticeType,
      actors,
      entities
    }
  }

  /**
   * Find an users' notices by a given user id in batches.
   */
  async findNoticesByUserId(
    userId: string,
    offset: number,
    limit = BATCH_SIZE
  ): Promise<any[]> {
    const notices = await this.findNoticesWithDetail({
      where: { recipientId: userId, deleted: false },
      offset,
      limit
    })

    return notices.map(async (notice: any) => {
      const entities = await this.findEntitiesByNoticeId(notice.id)
      const actors = await this.findActorsByNoticeId(notice.id)

      return {
        ...notice,
        createdAt: notice.updatedAt,
        type: notice.noticeType,
        actors,
        entities
      }
    })
  }

  /**
   * Mark all notices as read
   */
  markAllNoticesAsRead = async (userId: string): Promise<any> => {
    await this.knex('notice')
      .where({ recipientId: userId, unread: true })
      .update({ unread: false })
  }
}

export default NoticeService
