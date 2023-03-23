import { GQLCircleIncomeAnalyticsTypeResolver } from 'definitions/schema'

import history from './history.js'
import nextMonth from './nextMonth.js'
import thisMonth from './thisMonth.js'
import total from './total.js'

const resolvers: GQLCircleIncomeAnalyticsTypeResolver = {
  history,
  total,
  thisMonth,
  nextMonth,
}

export default resolvers
