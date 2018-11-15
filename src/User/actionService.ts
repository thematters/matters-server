import { randomText, randomIds } from '../connectors/mockData'
import { BaseService } from '../connectors/baseService'

type actionVerbType =
  | 'appreciate'
  | 'follow'
  | 'unfollow'
  | 'subscribe'
  | 'rate_article'
  | 'rate_user'
  | 'vote'
  | 'finish'

// start of test data ->
export const testSize = 100

const createTestAction = (id: string) => ({
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
  createTestAction(String(i))
)
// <- end of test data

export class ActionService extends BaseService {
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
