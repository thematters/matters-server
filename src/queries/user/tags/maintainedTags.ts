import { connectionFromPromisedArray } from 'common/utils/index.js'
import { UserToTagsResolver } from 'definitions'

const resolver: UserToTagsResolver = async (
  { id },
  { input },
  { dataSources: { tagService } }
) => {
  return connectionFromPromisedArray(tagService.findByMaintainer(id), input)
}

export default resolver
