import { ARTICLE_STATE } from 'common/enums'
import { correctHtml, isArticleLimitedFree } from 'common/utils'
import { ArticleToContentResolver } from 'definitions'

// ACL for article content
const resolver: ArticleToContentResolver = async (
  { articleId, authorId, content },
  _,
  { viewer, dataSources: { articleService, atomService } }
) => {
  const article = await articleService.dataloader.load(articleId)

  const isActive = article.state === ARTICLE_STATE.active
  const isAdmin = viewer.hasRole('admin')
  const isAuthor = authorId === viewer.id

  if (isAdmin || isAuthor) {
    return correctHtml(content)
  }

  // inactive
  if (!isActive) {
    return ''
  }

  // active
  const record = await atomService.findFirst({
    table: 'article_circle',
    where: { articleId },
  })

  // not in circle
  if (!record) {
    return correctHtml(content)
  }

  // not under the free period
  if (!isArticleLimitedFree(record.createdAt)) {
    return ''
  }

  return correctHtml(content)
}

export default resolver
