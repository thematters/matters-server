import DataLoader from 'dataloader'
import { v4 } from 'uuid'

import { BATCH_SIZE } from 'common/enums'
import { BaseService } from './baseService'

export class DraftService extends BaseService {
  constructor() {
    super('draft')
    this.idLoader = new DataLoader(this.baseFindByIds)
    this.uuidLoader = new DataLoader(this.baseFindByUUIDs)
  }

  create = async ({
    authorId,
    upstreamId,
    title,
    cover,
    content,
    tags
  }: {
    [key: string]: any
  }) => {
    return await this.baseCreate({
      uuid: v4(),
      authorId,
      upstreamId,
      title,
      cover,
      abstract: '', // TODO
      content,
      tags
    })
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
   * Find user's drafts by a given author id (user).
   */
  findByAuthor = async (authorId: string): Promise<any[]> =>
    await this.knex
      .select()
      .from(this.table)
      .where({ authorId })

  /**
   *  Find drafts by a given author id (user) in batches.
   */
  findByAuthorInBatch = async (
    authorId: string,
    offset: number,
    limit = BATCH_SIZE
  ): Promise<any[]> =>
    await this.knex
      .select()
      .from(this.table)
      .where({ authorId })
      .orderBy('id', 'desc')
      .offset(offset)
      .limit(limit)

  /**
   * Find audio draft by a given id.
   */
  findAudioDraft = async (id: string): Promise<any[]> =>
    await this.knex
      .select()
      .from('audio_draft')
      .where({ id })

  // /**
  //  * Find audio drafts by a given author id (user).
  //  */
  // findAudioDraftsByAuthor = async (authorId: string): Promise<any[]> =>
  //   await this.knex
  //     .select()
  //     .from('audio_draft')
  //     .where({ authorId })

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
