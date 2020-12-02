import { ARTICLE_STATE } from 'common/enums'
import { correctHtml } from 'common/utils'
import { ArticleToContentResolver } from 'definitions'

// ACL for article content
const resolver: ArticleToContentResolver = async (
  { articleId, authorId, content },
  _,
  { viewer, dataSources: { articleService } }
) => {
  const article = await articleService.dataloader.load(articleId)

  const isActive = article.state === ARTICLE_STATE.active
  const isAdmin = viewer.hasRole('admin')
  const isAuthor = authorId === viewer.id

  if (isActive || isAdmin || isAuthor) {
    return correctHtml(content)
  }

  return ''
}

export default resolver
