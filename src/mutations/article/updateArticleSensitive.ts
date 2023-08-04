import type { GQLMutationResolvers } from 'definitions'

import { ArticleNotFoundError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['updateArticleSensitive'] = async (
  _,
  { input: { id, sensitive } },
  { dataSources: { articleService, draftService } }
) => {
  const { id: dbId } = fromGlobalId(id)

  const article = await articleService.baseFindById(dbId)
  if (!article) {
    throw new ArticleNotFoundError('article does not exist')
  }

  const draft = await draftService.baseUpdate(article.draftId, {
    sensitiveByAdmin: sensitive,
    updatedAt: new Date(),
  })

  return draft
}

export default resolver
