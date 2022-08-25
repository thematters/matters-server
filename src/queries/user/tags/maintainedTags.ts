import { connectionFromPromisedArray } from 'common/utils'
import { UserToTagsResolver } from 'definitions'

const resolver: UserToTagsResolver = async (
  { id },
  { input },
  { dataSources: { tagService } }
) => {
  return connectionFromPromisedArray(tagService.findByMaintainer(id), input)
}

export default resolver
