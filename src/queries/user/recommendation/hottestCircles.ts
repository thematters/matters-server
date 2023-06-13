import { connectionFromArray } from 'common/utils'
import { RecommendationToHottestCirclesResolver } from 'definitions'

const resolver: RecommendationToHottestCirclesResolver = async (
  { id },
  { input },
  { viewer, dataSources: { atomService }, knex }
) =>
  // TODO: add business logic
  connectionFromArray([], input, 0)

export default resolver
