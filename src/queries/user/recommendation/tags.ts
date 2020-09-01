import { chunk } from 'lodash'

import { ForbiddenError } from 'common/errors'
import {
  connectionFromArray,
  connectionFromPromisedArray,
  cursorToIndex,
} from 'common/utils'
import { RecommendationToTagsResolver } from 'definitions'

export const tags: RecommendationToTagsResolver = async (
  { id },
  { input },
  { viewer, dataSources: { tagService, userService } }
) => {
  const { after, first, filter, oss = false } = input

  if (oss) {
    if (!viewer.hasRole('admin')) {
      throw new ForbiddenError('only admin can access oss')
    }
  }

  // pick randomly
  if (typeof filter?.random === 'number') {
    const { random } = filter
    const draw = first || 5
    const limit = 50

    const mattyUser = await userService.findByEmail('hi@matters.news')
    const curationTags = await tagService.findCurationTags({
      mattyId: mattyUser.id,
      limit: limit * draw,
      oss,
    })
    const chunks = chunk(curationTags, draw)
    const index = Math.min(random, limit, chunks.length - 1)
    const filteredTags = chunks[index] || []
    return connectionFromArray(filteredTags, input, curationTags.length)
  }

  const offset = cursorToIndex(after) + 1
  const totalCount = await tagService.baseCount()
  return connectionFromPromisedArray(
    tagService.recommendTags({
      offset,
      limit: first,
      oss,
    }),
    input,
    totalCount
  )
}
