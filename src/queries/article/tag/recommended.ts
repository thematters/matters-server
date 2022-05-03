import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'
import { TagToRecommendedResolver } from 'definitions'

const resolver: TagToRecommendedResolver = async (
  { id, owner },
  { input },
  { dataSources: { tagService, userService } }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const { take, skip } = fromConnectionArgs(input)

  const related = tagService.findRelatedTags({ id, take, skip })

  return connectionFromPromisedArray(related, input)
}

export default resolver
