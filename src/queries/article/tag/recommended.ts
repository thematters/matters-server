import chunk from 'lodash/chunk.js'

import { TAGS_RECOMMENDED_LIMIT } from 'common/enums/index.js'
import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
  normalizeTagInput,
} from 'common/utils/index.js'
import { Item, TagToRecommendedResolver } from 'definitions'

const resolver: TagToRecommendedResolver = async (
  { id, content: inputContent, owner },
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

  const relatedIds = await tagService.findRelatedTags({
    id,
    content: inputContent,
  })

  const tags = (
    (await tagService.dataloader.loadMany(
      relatedIds.map((tag: any) => `${tag.id}`)
    )) as Item[]
  ).filter(({ content }) => normalizeTagInput(content) === content)

  const totalCount = tags?.length ?? 0

  const { filter } = input

  if (typeof filter?.random === 'number') {
    const { random } = filter
    const draw = input.first || 5
    const limit = 50

    // chunk the list of tags per draw
    const chunks = chunk(tags, draw)
    const index = Math.min(random, limit, chunks.length - 1)
    const filteredTags = chunks[index] || []

    return connectionFromPromisedArray(
      tagService.dataloader.loadMany(
        filteredTags.map((tag: any) => `${tag.id}`)
      ),
      input,
      totalCount
    )
  }

  const s = skip ?? 0
  const end = s + (take ?? TAGS_RECOMMENDED_LIMIT)

  return connectionFromPromisedArray(tags.slice(s, end), input, totalCount)
}

export default resolver
