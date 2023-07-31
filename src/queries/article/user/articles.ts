import type { GQLUserResolvers } from 'definitions'

import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromGlobalId,
} from 'common/utils'

const resolver: GQLUserResolvers['articles'] = async (
  { id },
  { input },
  { dataSources: { articleService, draftService }, viewer }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const isViewer = viewer.id === id
  const isAdmin = viewer.hasRole('admin')

  const tagIds = input.filter?.tagIds?.map((tagId) => fromGlobalId(tagId).id)
  const articles = await articleService.findByAuthor(id, {
    // filter,
    showAll: isViewer || isAdmin,
    tagIds,
    orderBy: [{ column: 'article.id', order: 'desc' }],
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
