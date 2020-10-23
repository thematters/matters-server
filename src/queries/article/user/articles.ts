import { ARTICLE_STATE } from 'common/enums'
import { connectionFromPromisedArray } from 'common/utils'
import { UserToArticlesResolver } from 'definitions'

const resolver: UserToArticlesResolver = async (
  { id },
  { input },
  { dataSources: { articleService, draftService }, viewer }
) => {
  const isViewer = viewer.id === id
  const isAdmin = viewer.hasRole('admin')

  const filter = isViewer || isAdmin ? {} : { state: ARTICLE_STATE.active }
  const articles = await articleService.findByAuthor(id, filter, true)

  return connectionFromPromisedArray(
    draftService.dataloader.loadMany(
      articles.map((article) => article.draftId)
    ),
    input
  )
}

export default resolver
