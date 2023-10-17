import type { GQLRecommendationResolvers } from 'definitions'

import { connectionFromArray } from 'common/utils'

const resolver: GQLRecommendationResolvers['hottestCircles'] = async (
  _,
  { input }
) =>
  // TODO: add business logic
  connectionFromArray([], input, 0)

export default resolver
