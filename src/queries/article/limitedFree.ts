import { isArticleLimitedFree } from 'common/utils'
import { ArticleToLimitedFreeResolver } from 'definitions'

const resolver: ArticleToLimitedFreeResolver = async (
  { articleId },
  _,
  { dataSources: { atomService } }
) => {
  const record = await atomService.findFirst({
    table: 'article_circle',
    where: { articleId },
  })

  // not in circle
  if (!record) {
    return false
  }

  return isArticleLimitedFree(record.createdAt)
}

export default resolver
