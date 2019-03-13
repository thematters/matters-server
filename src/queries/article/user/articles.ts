import { connectionFromPromisedArray } from 'common/utils'

import { UserToArticlesResolver } from 'definitions'
import { ARTICLE_STATE } from 'common/enums'

const resolver: UserToArticlesResolver = (
  { id },
  { input },
  { dataSources: { articleService }, viewer }
) => {
  const filter = viewer.id === id ? {} : { state: ARTICLE_STATE.active }
  return connectionFromPromisedArray(
    articleService.findByAuthor(id, filter),
    input
  )
}

export default resolver
