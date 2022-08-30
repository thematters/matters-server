import { ARTICLE_STATE } from 'common/enums'
// import { UserInputError } from 'common/errors'
import { connectionFromArray, connectionFromPromisedArray } from 'common/utils'
import { UserToArticlesResolver } from 'definitions'

const resolver: UserToArticlesResolver = async (
  { id },
  { input },
  { dataSources: { articleService, draftService }, viewer }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const isViewer = viewer.id === id
  const isAdmin = viewer.hasRole('admin')

  const tagIds = input.filter?.tagIds
  // const inRange = input.filter?.inRange as [string | null, string | null]

  const filter = isViewer || isAdmin ? {} : { state: ARTICLE_STATE.active }
  const articles = await articleService.findByAuthor(id, {
    filter,
    stickyFirst: true,
    tagIds,
    inRangeStart: input.filter?.inRangeStart,
    inRangeEnd: input.filter?.inRangeEnd,
  })

  return connectionFromPromisedArray(
    draftService.dataloader.loadMany(
      articles.map((article: any) => article.draftId)
    ),
    input
  )
}

export default resolver
