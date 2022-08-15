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


  if (typeof filter?.random === 'number') {
    const { random } = filter
    const draw = input.first || 5
    const limit = 50

  //take (limit * draw) amounts of related tags
  const related = await tagService.findRelatedTags({ id, content, take: limit * draw, skip })
  //chunk the list of tags per draw
  const chunks = chunk(related, draw)
  const index = Math.min(random, limit, chunks.length - 1)
  const filteredTags = chunks[index] || []

  return connectionFromPromisedArray(
    tagService.dataloader.loadMany(
      filteredTags.map((tag: any) => `${tag.id}`)
    ),
    input,
    related.length
  )
}
  return connectionFromPromisedArray(tagService.findRelatedTags({ id, content, take, skip }), input)
}

export default resolver
