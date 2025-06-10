import type { SQSEvent } from 'aws-lambda'

import { PaymentService } from '#connectors/index.js'

import { connections } from '../connections.js'

interface PayToMessage {
  txId: string
}

const paymentService = new PaymentService(connections)

export const handler = async (event: SQSEvent) => {
  console.log(event.Records)

  const results = await Promise.allSettled(
    event.Records.map(async ({ body }: { body: string }) => {
      const { txId } = JSON.parse(body) as PayToMessage

      if (txId) {
        console.log('Processing payment tx:', txId)
        return await paymentService.payToBlockchain({ txId })
      } else {
        throw new Error('Invalid message format: missing txId')
      }
    })
  )

  // Print failed reasons
  results.forEach((res) => {
    if (res.status === 'rejected') {
      console.error('Failed to process payment message:', res.reason)
    }
  })

  // Return batch item failures for SQS to retry
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
