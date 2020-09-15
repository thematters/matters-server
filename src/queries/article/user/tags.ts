import { environment } from 'common/environment'
import { connectionFromPromisedArray } from 'common/utils'
import { UserToArticlesResolver } from 'definitions'

const resolver: UserToArticlesResolver = async (
  { id },
  { input },
  { dataSources: { tagService, userService } }
) => {
  const isMatty = id === environment.mattyId

  if (isMatty) {
    return connectionFromPromisedArray(tagService.findByCreator(id), input)
  }

  return connectionFromPromisedArray(tagService.findByOwner(id), input)
}

export default resolver
