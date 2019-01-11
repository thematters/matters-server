import DataLoader from 'dataloader'
import { ItemData } from 'definitions'
import { v4 } from 'uuid'

import { BATCH_SIZE } from 'common/enums'
import { BaseService } from './baseService'

export class DraftService extends BaseService {
  constructor() {
    super('draft')
    this.dataloader = new DataLoader(this.baseFindByIds)
    this.uuidLoader = new DataLoader(this.baseFindByUUIDs)
  }

  /**
   * Count user's drafts by a given author id (user).
   */
  countByAuthor = async (authorId: string): Promise<number> => {
    const result = await this.knex(this.table)
      .countDistinct('id')
      .where({ authorId })
      .first()
    return parseInt(result.count, 10)
  }

  /**
   *  Find drafts by a given author id (user) in batches.
   */
  findByAuthor = async (
    authorId: string,
    offset = 0,
    limit = BATCH_SIZE
  ): Promise<any[]> =>
    await this.knex
      .select()
      .from(this.table)
      .where({ authorId, archived: false })
      .orderBy('id', 'desc')
      .offset(offset)
      .limit(limit)

  /**
   * Find drafts by publish state
   */
  findByPublishState = async (publishState: string) =>
    this.knex
      .select()
      .from(this.table)
      .where({
        publishState
      })

  /**
   * Find audio draft by a given id.
   */
  findAudioDraft = async (id: string): Promise<any[]> =>
    await this.knex
      .select()
      .from('audio_draft')
      .where({ id })

  /**
   * Find audio drafts by a given author id (user) in batches.
   */
  findAudioDraftsByAuthor = async (
    authorId: string,
    offset = 0,
    limit = BATCH_SIZE
  ): Promise<any[]> =>
    await this.knex
      .select()
      .from('audio_draft')
      .where({ authorId })
      .orderBy('id', 'desc')
      .offset(offset)
      .limit(limit)
}
