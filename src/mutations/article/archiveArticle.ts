import { ARTICLE_STATE, CACHE_KEYWORD, NODE_TYPES } from 'common/enums'
import { AuthenticationError, ForbiddenError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToArchiveArticleResolver } from 'definitions'

const resolver: MutationToArchiveArticleResolver = async (
  _,
  { input: { id } },
  { viewer, dataSources: { articleService, notificationService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id: dbId } = fromGlobalId(id)
  const { authorId } = await articleService.dataloader.load(dbId)

  if (authorId !== viewer.id) {
    throw new ForbiddenError('viewer has no permission')
  }

  const article = await articleService.archive(dbId)

  // Add custom data for cache invalidation
  article[CACHE_KEYWORD] = [
    {
      id: article.id,
      type: NODE_TYPES.article
    },
    {
      id: article.authorId,
      type: NODE_TYPES.user
    }
  ]

  return article
}

export default resolver
