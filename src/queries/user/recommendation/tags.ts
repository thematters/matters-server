import chunk from 'lodash/chunk.js'

import { VIEW } from 'common/enums/index.js'
// import { environment } from 'common/environment.js'
import { ForbiddenError } from 'common/errors.js'
import {
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils/index.js'
import { RecommendationToTagsResolver } from 'definitions'

export const tags: RecommendationToTagsResolver = async (
  { id },
  { input },
  { viewer, dataSources: { tagService } }
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
      top: 'r2w',
      minAuthors: 5, // show at least 5 authors in the curation
    })

    const chunks = chunk(curationTags, draw)
    const index = Math.min(random, limit, chunks.length - 1)
    const filteredTags = chunks[index] || []

    return connectionFromPromisedArray(
      tagService.dataloader.loadMany(
        filteredTags.map((tag: any) => `${tag.id}`)
      ),
      input,
      curationTags.length
    )
  }

  const totalCount = await tagService.baseCount(
    undefined, // where
    VIEW.tags_lasts_view
  )
  const items = await tagService.findTopTags({
    skip,
    take,
  })

  return connectionFromPromisedArray(
    tagService.dataloader.loadMany(items.map((item: any) => `${item.id}`)),
    input,
    totalCount
  )
}
