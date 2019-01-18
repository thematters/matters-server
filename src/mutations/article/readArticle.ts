import { AuthenticationError, ForbiddenError } from 'apollo-server'
import { MutationToReadArticleResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToReadArticleResolver = async (
  root,
  { input: { id } },
  { viewer, dataSources: { articleService } }
) => {
  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.dataloader.load(dbId)
  if (!article) {
    throw new ForbiddenError('target article does not exists')
  }

  await articleService.read({
    articleId: article.id,
    userId: viewer.id,
    ip: viewer.ip
  })

  return true
}

export default resolver
