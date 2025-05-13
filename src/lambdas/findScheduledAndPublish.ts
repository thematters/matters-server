import { ArticleService } from '#connectors/articleService.js'

import { connections } from '../connections.js'

export const handler = async () => {
  try {
    const articleService = new ArticleService(connections)

    // Get current date
    const now = new Date()

    // Find and publish scheduled articles from the last hour
    const articles = await articleService.findScheduledAndPublish(now, 1)

    if (articles.length > 0) {
      console.log(
        `Successfully processed ${articles.length} scheduled articles`
      )
    } else {
      console.log(`No scheduled drafts found`)
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Successfully processed scheduled articles',
      }),
    }
  } catch (error) {
    console.error('Failed to process scheduled articles:', error)

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to process scheduled articles',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    }
  }
}
