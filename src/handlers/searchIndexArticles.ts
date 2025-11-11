import type { SQSEvent } from 'aws-lambda'

import { SearchService } from '#connectors/searchService.js'

import { connections } from '../connections.js'

const searchService = new SearchService(connections)

export const handler = async (event: SQSEvent) => {
  try {
    const articleIds = event.Records.map(
      ({ body }) => JSON.parse(body).articleId
    )
    console.log(`Indexing ${articleIds}`)
    await searchService.indexArticles(articleIds)
  } catch (err) {
    console.error(err)
    return {
      batchItemFailures: event.Records.map(({ messageId }) => ({
        itemIdentifier: messageId,
      })),
    }
  }

  return {
    batchItemFailures: [],
  }
}
