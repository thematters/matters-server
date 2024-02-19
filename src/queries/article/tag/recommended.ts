import type { GQLTagResolvers } from 'definitions'

import { chunk } from 'lodash'

import { TAGS_RECOMMENDED_LIMIT } from 'common/enums'
import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
  normalizeTagInput,
} from 'common/utils'

const resolver: GQLTagResolvers['recommended'] = async (
  { id },
  { input },
  { dataSources: { tagService, atomService } }
) => {
  const { take, skip } = fromConnectionArgs(input, {
    allowTakeAll: true,
    maxTake: TAGS_RECOMMENDED_LIMIT,
    maxSkip: TAGS_RECOMMENDED_LIMIT,
  })

  if (!id) {
    return connectionFromArray([], input)
  }

  const relatedIds = await tagService.findRelatedTags({ id })

  const tags = (
    await atomService.tagIdLoader.loadMany(relatedIds.map((tag) => tag.id))
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
      atomService.tagIdLoader.loadMany(filteredTags.map((tag) => tag.id)),
      input,
      totalCount
    )
  }

  const s = skip ?? 0
  const end = s + (take ?? TAGS_RECOMMENDED_LIMIT)

  return connectionFromPromisedArray(tags.slice(s, end), input, totalCount)
}

export default resolver
