import { BaseService, BaseItem, Item } from '../connectors/baseService'
import DataLoader from 'dataloader'
import { QueryInput } from 'aws-sdk/clients/dynamodb'

export class UserService extends BaseService {

  usersLoader: DataLoader<string, any>

  constructor() {
    super('user')
    this.usersLoader = new DataLoader(this.findByIds)
  }

  /**
   * Get an array of user item by a given email.
   */
  findByEmail = async (email: string): Promise<Item[]> => {
    const params = {
      IndexName: 'email-index',
      ScanIndexForward: false,
      KeyConditionExpression: '#email = :email',
      ExpressionAttributeNames: {
        '#email': 'email'
      },
      ExpressionAttributeValues: {
        ':email': email
      }
    } as Partial<QueryInput>
    return this.baseQuery(params)
  }

  /**
   * Get an array of user item by a given user name.
   */
  findByUserName = async (name: string): Promise<Item[]> => {
    const params = {
      IndexName: 'userName-index',
      ScanIndexForward: false,
      KeyConditionExpression: '#userName = :userName',
      ExpressionAttributeNames: {
        '#userName': 'userName'
      },
      ExpressionAttributeValues: {
        ':userName': name
      }
    } as Partial<QueryInput>
    return this.baseQuery(params)
  }
}
