import {
  ArticleNotFoundError,
  AuthenticationError,
  EntityNotFoundError
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToUnsubscribeArticleResolver } from 'definitions'

const resolver: MutationToUnsubscribeArticleResolver = async (
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
    throw new ArticleNotFoundError('target article does not exists')
  }

  await articleService.unsubscribe(article.id, viewer.id)

  return article
}

export default resolver
