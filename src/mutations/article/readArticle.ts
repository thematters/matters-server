import { AuthenticationError, ForbiddenError } from 'apollo-server'
import { MutationToReadArticleResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToReadArticleResolver = async (
  root,
  { input: { id } },
  { viewer, dataSources: { articleService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }
  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.dataloader.load(dbId)
  if (!article) {
    throw new ForbiddenError('target article does not exists')
  }

  await articleService.read(article.id, viewer.id)

  return true
}

export default resolver
