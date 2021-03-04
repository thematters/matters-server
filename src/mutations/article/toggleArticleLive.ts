import { ArticleNotFoundError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToToggleArticleLiveResolver } from 'definitions'

const resolver: MutationToToggleArticleLiveResolver = async (
  root,
  { input: { id, enabled } },
  { viewer, dataSources: { articleService, draftService } }
) => {
  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.baseFindById(dbId)
  if (!article) {
    throw new ArticleNotFoundError('target article does not exists')
  }

  await articleService.baseUpdate(dbId, {
    live: enabled,
    updatedAt: new Date(),
  })

  const node = await draftService.baseFindById(article.draftId)
  return node
}

export default resolver
