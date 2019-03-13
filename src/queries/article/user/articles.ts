import { connectionFromPromisedArray } from 'common/utils'

import { UserToArticlesResolver } from 'definitions'

const resolver: UserToArticlesResolver = (
  { id },
  { input },
  { dataSources: { articleService }, viewer }
) => {
  const filter = viewer.id === id ? {} : { state: 'active' }
  return connectionFromPromisedArray(
    articleService.findByAuthor(id, filter),
    input
  )
}

export default resolver
