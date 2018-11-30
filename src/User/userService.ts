import { BaseService } from 'src/connectors/baseService'
import DataLoader from 'dataloader'

export class UserService extends BaseService {
  constructor() {
    super('user')
    this.fields = [
      'id',
      'uuid',
      'user_name as userName',
      'display_name as displayName',
      'description',
      'avatar',
      'email',
      'mobile',
      'password',
      'read_speed as readSpeed',
      'base_gravity as baseGravity',
      'curr_gravity as currGravity',
      'mat',
      'language',
      'oauth_type as oauthType',
      'status',
      'created_at as createdAt',
      'updated_at as updatedAt'
    ]
    this.loader = new DataLoader(this.baseFindByUUIDs)
  }

  /**
   * Find users by a given email.
   */
  findByEmail = async (email: string): Promise<any[]> => {
    return await this.knex
      .select(this.fields)
      .from(this.table)
      .where('email', email)
  }

  /**
   * Find users by a given user name.
   */
  findByUserName = async (name: string): Promise<any[]> => {
    return await this.knex
      .select(this.fields)
      .from(this.table)
      .where('user_name', name)
  }
}
