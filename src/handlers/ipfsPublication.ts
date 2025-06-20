import type { SQSEvent } from 'aws-lambda'

import { IPFSPublicationService } from '#root/src/connectors/article/ipfsPublicationService.js'

import { connections } from '../connections.js'

interface PublicationMessage {
  articleId: string
  articleVersionId: string
}

const ipfsPublicationService = new IPFSPublicationService(connections)

export const handler = async (event: SQSEvent) => {
  console.log(event.Records)

  const results = await Promise.allSettled(
    event.Records.map(async ({ body }: { body: string }) => {
      const { articleId, articleVersionId } = JSON.parse(
        body
      ) as PublicationMessage
      await ipfsPublicationService.publish({
        articleId,
        articleVersionId,
      })
    })
  )
  // Log failed reasons
  results.forEach((res) => {
    if (res.status === 'rejected') {
      console.error(res.reason)
    }
  })

  // Return batch item failures for SQS
  return {
    batchItemFailures: results
      .map((res, index) => {
        if (res.status === 'rejected') {
          return { itemIdentifier: event.Records[index].messageId }
        }
      })
      .filter(Boolean),
  }
}
