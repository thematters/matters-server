import type { GQLMutationResolvers } from 'definitions'

import { ARTICLE_STATE } from 'common/enums'
import { ArticleNotFoundError } from 'common/errors'
import { getLogger } from 'common/logger'
import { fromGlobalId } from 'common/utils'

const logger = getLogger('mutation-read-article')

const resolver: GQLMutationResolvers['readArticle'] = async (
  _,
  { input: { id } },
  { viewer, dataSources: { atomService, articleService } }
) => {
  const { id: dbId } = fromGlobalId(id)

  const article = await atomService.findFirst({
    table: 'article',
    where: { id: dbId, state: ARTICLE_STATE.active },
  })
  if (!article) {
    logger.warn('target article %s does not exists', id)
    throw new ArticleNotFoundError('target article does not exists')
  }

  // only record if viewer read others articles
  if (viewer.id !== article.authorId) {
    await articleService.read({
      articleId: article.id,
      userId: viewer.id || null,
      ip: viewer.ip,
    })
  }

  return article
}

export default resolver
