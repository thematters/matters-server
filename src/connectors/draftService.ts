import DataLoader from 'dataloader'

import { BaseService } from './baseService'

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
  countByAuthor = async (authorId: string): Promise<number> => {
    const result = await this.knex(this.table)
      .where({ authorId, archived: false })
      .count()
      .first()
    return parseInt(result.count, 10)
  }

  /**
   *  Find drafts by a given author id (user).
   */
  findByAuthor = async (authorId: string): Promise<any[]> =>
    await this.knex
      .select()
      .from(this.table)
      .where({ authorId, archived: false })
      .orderBy('updated_at', 'desc')

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

  /*********************************
   *                               *
   *           Audio Draft         *
   *                               *
   *********************************/
  /**
   * Find audio draft by a given id.
   */
  findAudiodraft = async (id: string): Promise<any[]> =>
    await this.knex
      .select()
      .from('audio_draft')
      .where({ id })

  /**
   * Find audio drafts by a given author id (user).
   */
  findAudiodraftsByAuthor = async (authorId: string): Promise<any[]> =>
    await this.knex
      .select()
      .from('audio_draft')
      .where({ authorId })
      .orderBy('id', 'desc')
}
