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
  if (!id) {
    return connectionFromArray([], input)
  }

  const { take, skip } = fromConnectionArgs(input, {
    allowTakeAll: true, // max 100 isn't too badly hurting
    maxTake: TAGS_RECOMMENDED_LIMIT,
    maxSkip: TAGS_RECOMMENDED_LIMIT,
  })

  const related = tagService.findRelatedTags({ id, content, take, skip })

  return connectionFromPromisedArray(related, input)
}

export default resolver
