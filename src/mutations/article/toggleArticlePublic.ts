import { AuthenticationError } from 'apollo-server'
import { MutationToToggleArticlePublicResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToToggleArticlePublicResolver = async (
  root,
  { input: { id, enabled } },
  { viewer, dataSources: { articleService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('anonymous user cannot do this') // TODO
  }

  if (viewer.role !== 'admin') {
    throw new Error('only admin can do this') // TODO
  }

  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.dataloader.load(dbId)
  if (!article) {
    throw new Error('target article does not exists') // TODO
  }

  const updatedArticle = await articleService.baseUpdateById(dbId, {
    public: enabled
  })

  return updatedArticle
}

export default resolver
