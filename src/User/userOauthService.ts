import { BaseService } from 'src/connectors/baseService'
import DataLoader from 'dataloader'

export class UserOAuthService extends BaseService {

  constructor() {
    super('user_oauth')
    this.fields = [
      'id',
      'user_id as userId',
      'type',
      'token',
      'status',
      'created_at as createdAt',
      'updated_at as updatedAt'
    ]
  }

  /**
   * Find items by a given user id.
   */
  findByUserId = async (userId: number): Promise<any[]> => {
    return await this.knex
      .select(this.fields)
      .from(this.table)
      .where('user_id', userId)
  }

  /**
   * Find user's OAuth accounts by a given user id and type.
   */
  findByUserIdAndType = async (userId: number, type: string): Promise<any[]> => {
    return await this.knex
      .select(this.fields)
      .from(this.table)
      .where({
        'user_id': userId,
        'type': type
      })
  }
}
