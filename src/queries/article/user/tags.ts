import { connectionFromPromisedArray } from 'common/utils'
import { UserToArticlesResolver } from 'definitions'

const resolver: UserToArticlesResolver = async (
  { id },
  { input },
  { dataSources: { tagService, userService } }
) => {
  return connectionFromPromisedArray(tagService.findByMaintainer(id), input)
}

export default resolver
