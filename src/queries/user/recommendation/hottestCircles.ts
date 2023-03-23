import { connectionFromArray } from 'common/utils/index.js'
import { RecommendationToHottestCirclesResolver } from 'definitions'

const resolver: RecommendationToHottestCirclesResolver = async (
  { id },
  { input },
  { viewer, dataSources: { atomService }, knex }
) => {
  // TODO: add business logic
  return connectionFromArray([], input, 0)
}

export default resolver
