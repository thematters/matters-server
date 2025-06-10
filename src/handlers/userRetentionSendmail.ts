import type { SQSEvent } from 'aws-lambda'

import { UserRetentionService } from '#connectors/index.js'

import { connections } from '../connections.js'

const userRetentionService = new UserRetentionService(connections)

export const handler = async (event: SQSEvent) => {
  console.log(event)
  const results = await Promise.allSettled(
    event.Records.map(async ({ body }: { body: string }) => {
      const { userId, lastSeen, type } = JSON.parse(body)
      await userRetentionService.sendmail(userId, lastSeen, type)
    })
  )

  // print failed reseaon
  results.map((res) => {
    if (res.status === 'rejected') {
      console.error('sendmail failed, reason:')
      console.dir(res.reason, { depth: null })
    }
  })

  // https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#services-sqs-batchfailurereporting
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
