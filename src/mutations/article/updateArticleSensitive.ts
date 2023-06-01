import { ArticleNotFoundError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToUpdateArticleSensitiveResolver } from 'definitions'

const resolver: MutationToUpdateArticleSensitiveResolver = async (
  _,
  { input: { id, sensitive } },
  { dataSources: { articleService, draftService } }
) => {
  const { id: dbId } = fromGlobalId(id)

  const article = await articleService.baseFindById(dbId)
  if (!article) {
    throw new ArticleNotFoundError('article does not exist')
  }

  const draft = await draftService.baseUpdate(dbId, {
    sensitiveByAdmin: sensitive,
    updatedAt: new Date(),
  })

  return draft
}

export default resolver
