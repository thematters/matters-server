import { ARTICLE_STATE } from 'common/enums'
import { connectionFromPromisedArray } from 'common/utils'
import { UserToArticlesResolver } from 'definitions'

const resolver: UserToArticlesResolver = async (
  { id },
  { input },
  { dataSources: { articleService }, viewer }
) => {
  const isViewer = viewer.id === id
  const isAdmin = viewer.hasRole('admin')

  const filter = isViewer || isAdmin ? {} : { state: ARTICLE_STATE.active }
  const articleIds = (await articleService.findByAuthor(id, filter, true)).map(
    ({ id: articleId }) => articleId
  )

  return connectionFromPromisedArray(
    articleService.linkedDraftLoader.loadMany(articleIds),
    input
  )
}

export default resolver
