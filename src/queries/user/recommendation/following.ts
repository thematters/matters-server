import { connectionFromArray } from 'common/utils'
import { RecommendationToFollowingResolver } from 'definitions'

export const following: RecommendationToFollowingResolver = async (
  { id }: { id: string },
  { input },
  { dataSources: { articleService, draftService, userService } }
) => {
  return connectionFromArray([], input)
}
