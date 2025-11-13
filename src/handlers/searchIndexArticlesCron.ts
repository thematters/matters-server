import { ARTICLE_STATE } from '#common/enums/index.js'
import { ArticleService } from '#connectors/article/articleService.js'
import { SearchService } from '#connectors/searchService.js'

import { connections } from '../connections.js'

const articleService = new ArticleService(connections)
const searchService = new SearchService(connections)

export const handler = async () => {
  try {
    // Calculate date range for last week
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 7)

    console.log(
      `Finding articles created between ${startDate.toISOString()} and ${endDate.toISOString()}`
    )

    // Find all active articles created in the last week
    const articles = await articleService
      .findArticles({
        state: ARTICLE_STATE.active,
        datetimeRange: { start: startDate, end: endDate },
      })
      .orderBy('id', 'asc')
      .select('id')

    const articleIds = articles.map((article) => article.id)

    if (articleIds.length === 0) {
      console.log('No articles found in the last week')
      return { indexedCount: 0, totalCount: 0 }
    }

    console.log(`Found ${articleIds.length} articles in the last week`)

    // Find which articles are already indexed
    const indexedArticles = await connections
      .knexSearch('search_index.article')
      .where('id', '>=', articleIds[0])
      .select('id')

    const indexedIds = new Set(indexedArticles.map((a) => a.id))
    const missingArticleIds = articleIds.filter((id) => !indexedIds.has(id))

    if (missingArticleIds.length === 0) {
      console.log('All articles are already indexed')
      return { indexedCount: 0, totalCount: articleIds.length }
    }

    console.log(
      `Found ${missingArticleIds.length} missing articles out of ${articleIds.length} total`
    )

    // Index missing articles
    await searchService.indexArticles(missingArticleIds)

    console.log(`Successfully indexed ${missingArticleIds.length} articles`)

    return {
      indexedCount: missingArticleIds.length,
      totalCount: articleIds.length,
    }
  } catch (err) {
    console.error('Error indexing missing articles:', err)
    throw err
  }
}
