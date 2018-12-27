import { v4 } from 'uuid'

import { NoticeType } from 'definitions'
import { BATCH_SIZE } from 'common/enums'
import { BaseService } from '../baseService'

export type NoticeUser = string
export type NoticeEntity = {
  type: 'target' | 'downstream'
  entityType: string
  entityId: string
}
export type NoticeMessage = string
export type NoticeData = {
  url?: string
  [key: string]: any
}
export type PutNoticeParams = {
  type: NoticeType
  actors?: [NoticeUser?]
  recipientId: NoticeUser
  entities?: [NoticeEntity?]
  message?: NoticeMessage
  data?: NoticeData
}

class NoticeService extends BaseService {
  constructor() {
    super('notice')
  }

  /**
   * Create a notice item
   */
  create({
    type,
    actors = [],
    recipientId,
    entities = [],
    message,
    data
  }: PutNoticeParams) {
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

      // create notice actors
      await Promise.all(
        actors.map(async actorId => {
          await trx
            .insert({
              noticeId,
              actorId
            })
            .into('notice_actor')
        })
      )

      // craete notice entities
      await Promise.all(
        entities.map(async ({ type, entityTypeId, entityId }: any) => {
          await trx
            .insert({
              type,
              entityTypeId,
              entityId,
              noticeId
            })
            .into('notice_entity')
        })
      )
    })
  }

  /**
   * Process new event to determine
   * whether to bundle with old notice or write new notice
   */
  process(params: PutNoticeParams) {
    // TODO: bundle
    return this.create({ ...params })
  }

  /**
   * Detetmine notice can be bundle
   */
  private canBundle() {}

  /**
   * Find an users' notices by a given user id in batches.
   */
  async findNoticesByUserId(
    userId: string,
    offset: number,
    limit = BATCH_SIZE
  ): Promise<any[]> {
    const notices = await this.knex
      .select([
        'notice.id',
        'notice.uuid',
        'notice.unread',
        'notice.updated_at',
        'notice_detail.notice_type',
        'notice_detail.message',
        'notice_detail.data'
      ])
      .from('notice')
      .where({ recipientId: userId, deleted: false })
      .orderBy('updated_at', 'desc')
      .offset(offset)
      .limit(limit)
      .innerJoin(
        'notice_detail',
        'notice.notice_detail_id',
        '=',
        'notice_detail.id'
      )

    return notices.map(async (notice: any) => {
      // notice entities
      let target = null as any
      const entities = {} as any
      const _entities = await this.knex
        .select([
          'notice_entity.type',
          'notice_entity.entity_id',
          'entity_type.table'
        ])
        .from('notice_entity')
        .where({ noticeId: notice.id })
        .innerJoin(
          'entity_type',
          'entity_type.id',
          '=',
          'notice_entity.entity_type_id'
        )
      _entities.forEach(async ({ type, entityId, table }: any) => {
        const entity = await this.knex
          .select()
          .from(table)
          .where({ id: entityId })
          .first()
        if (type === 'target') {
          target = entity
        } else {
          entities[type] = entity
        }
      })

      // notice actors
      const actors = await this.knex
        .select('user.*')
        .from('notice_actor')
        .where({ noticeId: notice.id })
        .innerJoin('user', 'notice_actor.actor_id', '=', 'user.id')

      return {
        id: notice.id,
        uuid: notice.uuid,
        unread: notice.unread,
        createdAt: notice.updatedAt,
        type: notice.noticeType,
        actors,
        target,
        entities,
        message: notice.message,
        data: notice.data
      }
    })
  }
}

export default NoticeService
