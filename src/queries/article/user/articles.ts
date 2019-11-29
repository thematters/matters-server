import { ARTICLE_STATE } from 'common/enums'
import { connectionFromPromisedArray } from 'common/utils'
import { UserToArticlesResolver } from 'definitions'

const resolver: UserToArticlesResolver = (
  { id },
  { input },
  { dataSources: { articleService }, viewer }
) => {
  const isViewer = viewer.id === id
  const filter =
    isViewer || viewer.hasRole('admin') ? {} : { state: ARTICLE_STATE.active }

  return connectionFromPromisedArray(
    articleService.findByAuthor(id, filter, true),
    input
  )
}

export default resolver
