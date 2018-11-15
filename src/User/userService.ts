import { randomText, randomIds } from '../connectors/mockData'
import { BaseService } from '../connectors/baseService'

// start of test data ->
export const testSize = 20

const createTestUser = (id: string) => ({
  id,
  name: {
    displayName: randomText(2).join(' '),
    userName: randomText(2).join('-')
  },
  description: randomText(25).join(' '),
  email: `${randomText(2).join('')}@${randomText(1)}.com`,
  followerIds: randomIds(Math.ceil(testSize / 3), testSize),
  followIds: randomIds(Math.ceil(testSize / 3), testSize)
})

export const items = [...Array(testSize).keys()].map(i =>
  createTestUser(String(i))
)
// <- end of test data

export class UserService extends BaseService {
  // items = items
  constructor() {
    super(items)
  }

  // TODO: replaced by actual dynamoDB api
  // start of db calls ->
  // findByIds = (ids: Array<string>): Promise<typeof items> =>
  //   new Promise(resolve =>
  //     resolve(this.items.filter(({ id: itemId }) => ids.includes(itemId)))
  //   )
  // <- end of db calls
}
