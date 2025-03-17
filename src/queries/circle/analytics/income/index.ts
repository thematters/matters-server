import type { GQLCircleIncomeAnalyticsResolvers } from '#definitions/schema.js'

import history from './history.js'
import nextMonth from './nextMonth.js'
import thisMonth from './thisMonth.js'
import total from './total.js'

const resolvers: GQLCircleIncomeAnalyticsResolvers = {
  history,
  total,
  thisMonth,
  nextMonth,
}

export default resolvers
