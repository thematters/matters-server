import { BaseService } from '../connectors/baseService'
import { userItems } from './mockData'

export class UserService extends BaseService {
  // items = items
  constructor() {
    super(userItems)
  }

  // findById is defined in baseService
  // other db calls can be added here
}
