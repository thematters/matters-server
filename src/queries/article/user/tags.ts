import { connectionFromPromisedArray } from 'common/utils'
import { UserToArticlesResolver } from 'definitions'

const resolver: UserToArticlesResolver = async (
  { id },
  { input },
  { dataSources: { tagService, userService } }
) => {
  const mattyUser = await userService.findByEmail('hi@matters.news')
  const isMatty = mattyUser && id === mattyUser.id

  if (isMatty) {
    return connectionFromPromisedArray(tagService.findByCreator(id), input)
  }

  return connectionFromPromisedArray(tagService.findByOwner(id), input)
}

export default resolver
