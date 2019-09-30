import { ArticleNotFoundError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToToggleArticleLiveResolver } from 'definitions'

const resolver: MutationToToggleArticleLiveResolver = async (
  root,
  { input: { id, enabled } },
  { viewer, dataSources: { articleService } }
) => {
  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.dataloader.load(dbId)
  if (!article) {
    throw new ArticleNotFoundError('target article does not exists')
  }

  const updatedArticle = await articleService.baseUpdate(dbId, {
    live: enabled,
    updatedAt: new Date()
  })

  return updatedArticle
}

export default resolver
