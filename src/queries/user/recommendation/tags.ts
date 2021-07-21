import { chunk } from 'lodash'

import { environment } from 'common/environment'
import { ForbiddenError } from 'common/errors'
import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'
import { RecommendationToTagsResolver } from 'definitions'

export const tags: RecommendationToTagsResolver = async (
  { id },
  { input },
  { viewer, dataSources: { tagService, userService } }
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

    const curationTags = await tagService.findCurationTags({
      mattyId: environment.mattyId,
      take: limit * draw,
    })
    const chunks = chunk(curationTags, draw)
    const index = Math.min(random, limit, chunks.length - 1)
    const filteredTags = chunks[index] || []
    return connectionFromPromisedArray(
      tagService.dataloader.loadMany(filteredTags.map((tag) => tag.id)),
      input,
      curationTags.length
    )
  }

  // query all tags by specific logic (curation concat non-curation)
  const totalCount = await tagService.baseCount()
  const items = await tagService.findArrangedTags({
    mattyId: environment.mattyId,
    oss,
    skip,
    take,
  })
  return connectionFromPromisedArray(
    tagService.dataloader.loadMany(items.map((item) => item.id)),
    input,
    totalCount
  )
}
