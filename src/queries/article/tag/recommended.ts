import { chunk } from 'lodash'

import { TAGS_RECOMMENDED_LIMIT } from 'common/enums'
import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'
import { TagToRecommendedResolver } from 'definitions'

const resolver: TagToRecommendedResolver = async (
  { id, content, owner },
  { input },
  { dataSources: { tagService, userService } }
) => {
  const { take, skip } = fromConnectionArgs(input, {
    allowTakeAll: true,
    maxTake: TAGS_RECOMMENDED_LIMIT,
    maxSkip: TAGS_RECOMMENDED_LIMIT,
  })

  if (!id) {
    return connectionFromArray([], input)
  }
  const { filter } = input

  const related = await tagService.findRelatedTags({
    id,
    content,
    // take: limit * draw,
    // skip,
  })
  const totalCount = related?.length ?? 0

  if (typeof filter?.random === 'number') {
    const { random } = filter
    const draw = input.first || 5
    const limit = 50

    // take (limit * draw) amounts of related tags

    // chunk the list of tags per draw
    const chunks = chunk(related, draw)
    const index = Math.min(random, limit, chunks.length - 1)
    const filteredTags = chunks[index] || []

    return connectionFromPromisedArray(
      tagService.dataloader.loadMany(
        filteredTags.map((tag: any) => `${tag.id}`)
      ),
      input,
      totalCount // related.length
    )
  }

  // const tags = await tagService.findRelatedTags({ id, content, take, skip })

  // console.log(new Date, 'tag/recommended::', { skip, take, length: related.length, related })
  const s = skip ?? 0
  const end = s + (take ?? TAGS_RECOMMENDED_LIMIT)

  return connectionFromPromisedArray(
    tagService.dataloader.loadMany(
      related.slice(s, end).map((tag: any) => `${tag.id}`)
    ),
    input,
    totalCount // related.length
  )
}

export default resolver
