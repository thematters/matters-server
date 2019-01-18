import { AuthenticationError, ForbiddenError } from 'apollo-server'
import { MutationToToggleArticlePublicResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'
import { USER_ROLE } from 'common/enums'

const resolver: MutationToToggleArticlePublicResolver = async (
  root,
  { input: { id, enabled } },
  { viewer, dataSources: { articleService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (viewer.role !== USER_ROLE.admin) {
    throw new AuthenticationError('only admin can do this')
  }

  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.dataloader.load(dbId)
  if (!article) {
    throw new ForbiddenError('target article does not exists')
  }

  const updatedArticle = await articleService.baseUpdateById(dbId, {
    public: enabled
  })

  return updatedArticle
}

export default resolver
