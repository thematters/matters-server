import { BaseService } from './baseService'
import { BATCH_SIZE, USER_ACTION } from 'common/enums'
import DataLoader from 'dataloader'

export class DraftService extends BaseService {
  constructor() {
    super('draft')
    this.idLoader = new DataLoader(this.baseFindByIds)
    this.uuidLoader = new DataLoader(this.baseFindByUUIDs)
  }

  /**
   * Count user's drafts by a given author id (user).
   */
  countByAuthor = async (authorId: number): Promise<number> => {
    const result = await this.knex(this.table)
      .countDistinct('id')
      .where({ authorId })
      .first()
    return parseInt(result.count, 10)
  }

  /**
   * Find user's drafts by a given author id (user).
   */
  findByAuthor = async (authorId: number): Promise<any[]> =>
    await this.knex
      .select()
      .from(this.table)
      .where({ authorId })

  /**
   *  Find drafts by a given author id (user) in batches.
   */
  findByAuthorInBatch = async (
    authorId: number,
    offset: number,
    limit = BATCH_SIZE
  ): Promise<any[]> =>
    await this.knex
      .select()
      .from(this.table)
      .where({ authorId })
      .offset(offset)
      .limit(limit)

  /**
   * Find audio draft by a given id.
   */
  findAudioDraft = async (id: number): Promise<any[]> =>
    await this.knex
      .select()
      .from('audio_draft')
      .where({ id })

  /**
   * Find audio drafts by a given author id (user).
   */
  findAudioDraftsByAuthor = async (authorId: number): Promise<any[]> =>
    await this.knex
      .select()
      .from('audio_draft')
      .where({ authorId })

  /**
   * Find audio drafts by a given author id (user) in batches.
   */
  findAudioDraftsByAuthorInBatch = async (
    authorId: number,
    offset: number,
    limit = BATCH_SIZE
  ): Promise<any[]> =>
    await this.knex
      .select()
      .from('audio_draft')
      .where({ authorId })
      .offset(offset)
      .limit(limit)
}
