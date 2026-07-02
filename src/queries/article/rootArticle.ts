import type { Article, Context, GQLQueryResolvers } from '#definitions/index.js'

import { USER_STATE } from '#common/enums/index.js'
import { UserInputError } from '#common/errors.js'
import { getLogger } from '#common/logger.js'

const logger = getLogger('resolver-root-articles')

const hideFrozenAuthorArticle = async ({
  article,
  atomService,
  viewer,
}: {
  article: Article | null | undefined
  atomService: Context['dataSources']['atomService']
  viewer: Context['viewer']
}) => {
  if (!article) {
    return null
  }

  if (viewer.hasRole('admin')) {
    return article
  }

  const author = await atomService.userIdLoader.load(article.authorId)
  if (author?.state === USER_STATE.frozen) {
    return null
  }

  return article
}

const resolver: GQLQueryResolvers['article'] = async (
  _,
  { input: { mediaHash, shortHash } },
  { dataSources: { articleService, atomService }, viewer }
) => {
  if (shortHash) {
    const article = await articleService.findArticleByShortHash(shortHash)
    return hideFrozenAuthorArticle({ article, atomService, viewer })
  }
  if (mediaHash) {
    const node = await articleService.findVersionByMediaHash(mediaHash)
    if (!node) {
      logger.warn('article version by media_hash:%s not found', mediaHash)
      return null
    }
    const article = await atomService.articleIdLoader.load(node.articleId)
    return hideFrozenAuthorArticle({ article, atomService, viewer })
  }

  throw new UserInputError('one of mediaHash or shortHash is required')
}

export default resolver
