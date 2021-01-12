import { connectionFromArray, cursorToIndex } from 'common/utils'
import { RecommendationToHottestCirclesResolver } from 'definitions'

const resolver: RecommendationToHottestCirclesResolver = async (
  { id },
  { input },
  { viewer, dataSources: { atomService }, knex }
) => {
  const { first: take, after } = input
  const skip = cursorToIndex(after) + 1

  // TODO: add business logic
  return connectionFromArray([], input, 0)
}

export default resolver
