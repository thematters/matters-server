import { ForbiddenError } from 'apollo-server'
import { MutationToToggleArticlePublicResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToToggleArticlePublicResolver = async (
  root,
  { input: { id, enabled } },
  { viewer, dataSources: { articleService } }
) => {
  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.dataloader.load(dbId)
  if (!article) {
    throw new ForbiddenError('target article does not exists')
  }

  const updatedArticle = await articleService.baseUpdate(dbId, {
    public: enabled
  })

  return updatedArticle
}

export default resolver
