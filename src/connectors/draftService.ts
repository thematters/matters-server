import { BaseService } from './baseService'
import DataLoader from 'dataloader'
import { USER_ACTION } from 'common/enums'

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
  findByAuthor = async (authorId: number): Promise<number> =>
    await this.knex
      .select()
      .from(this.table)
      .where({ authorId })

}
