import { GQLCircleIncomeAnalyticsTypeResolver } from 'definitions/schema'

import history from './history'
import lastMonth from './lastMonth'
import thisMonth from './thisMonth'
import total from './total'

const resolvers: GQLCircleIncomeAnalyticsTypeResolver = {
  history,
  total,
  lastMonth,
  thisMonth,
}

export default resolvers
