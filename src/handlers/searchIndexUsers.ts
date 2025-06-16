import type { SQSEvent } from 'aws-lambda'

import { SearchService } from '#connectors/searchService.js'

import { connections } from '../connections.js'

const searchService = new SearchService(connections)

export const handler = async (event: SQSEvent) => {
  try {
    const userIds = event.Records.map(({ body }) => JSON.parse(body).userId)
    await searchService.indexUsers(userIds)
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
