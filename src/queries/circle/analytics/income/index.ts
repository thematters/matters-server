import type { GQLCircleIncomeAnalyticsResolvers } from 'definitions/schema'

import history from './history'
import nextMonth from './nextMonth'
import thisMonth from './thisMonth'
import total from './total'

const resolvers: GQLCircleIncomeAnalyticsResolvers = {
  history,
  total,
  thisMonth,
  nextMonth,
}

export default resolvers
