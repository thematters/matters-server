import { BaseService } from 'src/connectors/baseService'
import DataLoader from 'dataloader'
import { USER_ACTION } from 'src/common/enums'

export class DraftService extends BaseService {
  constructor() {
    super('draft')
    this.idLoader = new DataLoader(this.baseFindByIds)
    this.uuidLoader = new DataLoader(this.baseFindByUUIDs)
  }

  /**
   * Count user's drafts by a given author id (user).
   */
  countByAuthorId = async (authorId: number): Promise<number> => {
    const result = await this.knex(this.table)
      .countDistinct('id')
      .where('author_id', authorId)
    return result[0].count || 0
  }

  /**
   * Find user's drafts by a given author id (user).
   */
  findByAuthorId = async (authorId: number): Promise<number> => {
    return await this.knex
      .select()
      .from(this.table)
      .where('author_id', authorId)
  }
}
