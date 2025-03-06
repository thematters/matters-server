import type { GQLRecommendationResolvers } from '#definitions/index.js'

import { ForbiddenError } from '#common/errors.js'
import {
  connectionFromPromisedArray,
  fromConnectionArgs,
} from '#common/utils/index.js'
import { chunk } from 'lodash'

export const tags: GQLRecommendationResolvers['tags'] = async (
  _,
  { input },
  { viewer, dataSources: { tagService, atomService } }
) => {
  const { filter, oss = false } = input
  const { take, skip } = fromConnectionArgs(input, { defaultTake: 5 })

  if (oss) {
    if (!viewer.hasRole('admin')) {
      throw new ForbiddenError('only admin can access oss')
    }
  }

  // pick randomly
  if (typeof filter?.random === 'number') {
    const { random } = filter
    const draw = input.first || 5
    const limit = 50

    const curationTags = await tagService.findTopTags({
      take: limit * draw,
      minAuthors: 5,
    })

    const chunks = chunk(curationTags, draw)
    const index = Math.min(random, limit, chunks.length - 1)
    const filteredTags = chunks[index] || []

    return connectionFromPromisedArray(
      atomService.tagIdLoader.loadMany(filteredTags.map((tag) => tag.id)),
      input,
      curationTags.length
    )
  }

  const totalCount = await tagService.countTopTags()
  const items = await tagService.findTopTags({
    skip,
    take,
  })

  return connectionFromPromisedArray(
    atomService.tagIdLoader.loadMany(items.map((item) => item.id)),
    input,
    totalCount
  )
}
