import { MutationToReadArticleResolver } from 'definitions'

import { CACHE } from 'common/enums'
import { fromGlobalId } from 'common/utils'
import { ArticleNotFoundError } from 'common/errors'

const resolver: MutationToReadArticleResolver = async (
  root,
  { input: { id } },
  { viewer, dataSources: { articleService } }
) => {
  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.dataloader.load(dbId)
  if (!article) {
    throw new ArticleNotFoundError('target article does not exists')
  }

  await articleService.read({
    articleId: article.id,
    userId: viewer.id,
    ip: viewer.ip
  })

  // Add bypass for cache invaldation
  article[CACHE.keyword] = CACHE.bypass

  return article
}

export default resolver
