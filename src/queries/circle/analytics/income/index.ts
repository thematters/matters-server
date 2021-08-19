import { GQLCircleIncomeAnalyticsTypeResolver } from 'definitions/schema'

import history from './history'
import nextMonth from './nextMonth'
import thisMonth from './thisMonth'
import total from './total'

const resolvers: GQLCircleIncomeAnalyticsTypeResolver = {
  history,
  total,
  thisMonth,
  nextMonth,
}

export default resolvers
