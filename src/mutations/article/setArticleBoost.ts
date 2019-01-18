import { AuthenticationError, ForbiddenError } from 'apollo-server'
import { MutationToSetArticleBoostResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToSetArticleBoostResolver = async (
  root,
  { input: { id, boost } },
  { viewer, dataSources: { articleService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (viewer.role !== 'admin') {
    throw new AuthenticationError('only admin can do this')
  }

  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.dataloader.load(dbId)
  if (!article) {
    throw new ForbiddenError('target article does not exists')
  }

  await articleService.setBoost({ articleId: dbId, boost })

  return article
}

export default resolver
