import { connectionFromPromisedArray } from 'common/utils'
import { UserToArticlesResolver } from 'definitions'

const resolver: UserToArticlesResolver = async (
  { id },
  { input },
  { dataSources: { tagService, userService }, viewer }
) => {
  const mattyUser = await userService.findByEmail('hi@matters.news')
  const isMatty = viewer.id === mattyUser.id

  if (isMatty) {
    return connectionFromPromisedArray(tagService.findByCreator(id), input)
  }

  return connectionFromPromisedArray(tagService.findByEditor(id), input)
}

export default resolver
