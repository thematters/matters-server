import { BaseService } from 'src/connectors/baseService'

export class UserService extends BaseService {
  constructor() {
    super('user')
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
