import type { GQLTagResolvers } from 'definitions'

import { ArticleNotFoundError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLTagResolvers['selected'] = async (
  { id },
  { input },
  { dataSources: { tagService, articleService } }
) => {
  let articleId: string | undefined

  if (input.id) {
    articleId = fromGlobalId(input.id).id
  } else if (input.mediaHash) {
    const node = await articleService.findVersionByMediaHash(input.mediaHash)
    articleId = node.articleId
  }

  if (!articleId) {
    throw new ArticleNotFoundError('Cannot find article by a given input')
  }

  return tagService.isArticleSelected({
    articleId,
    tagId: id,
  })
}

export default resolver
