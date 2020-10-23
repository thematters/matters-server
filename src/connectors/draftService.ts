import DataLoader from 'dataloader'

import { PUBLISH_STATE } from 'common/enums'
import { BaseService } from 'connectors'

export class DraftService extends BaseService {
  constructor() {
    super('draft')
    this.dataloader = new DataLoader(this.baseFindByIds)
    this.uuidLoader = new DataLoader(this.baseFindByUUIDs)
  }

  /*********************************
   *                               *
   *             Draft             *
   *                               *
   *********************************/
  archive = async (id: string) =>
    this.baseUpdate(id, { archived: true, updatedAt: new Date() })

  /**
   * Count user's drafts by a given author id (user).
   */
  countByAuthor = async (authorId: string) => {
    const result = await this.knex(this.table)
      .where({ authorId, archived: false })
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Find drafts by publish state
   */
  findByPublishState = async (publishState: string) =>
    this.knex.select().from(this.table).where({
      publishState,
    })

  /**
   * Find unpublished drafts by a given author id (user).
   */
  findUnpublishedByAuthor = (authorId: string) =>
    this.knex
      .select()
      .from(this.table)
      .where({ authorId, archived: false })
      .andWhereNot({ publishState: PUBLISH_STATE.published })
      .orderBy('updated_at', 'desc')

  /**
   * Find draft by media hash.
   */
  findByMediaHash = async (mediaHash: string) =>
    this.knex.select().from(this.table).where({ mediaHash }).first()
}
