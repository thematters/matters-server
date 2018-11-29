import { BaseService } from 'src/connectors/baseService'
import DataLoader from 'dataloader'

export class UserService extends BaseService {
  constructor() {
    super('user')
    this.loader = new DataLoader(this.baseFindByIds)
  }

  /**
   * Find users by a given email.
   */
  findByEmail = async (email: string): Promise<any[]> => {
    return await this.knex
      .select()
      .from(this.table)
      .where('email', email)
  }

  /**
   * Find users by a given user name.
   */
  findByUserName = async (name: string): Promise<any[]> => {
    return await this.knex
      .select()
      .from(this.table)
      .where('userName', name)
  }
}
