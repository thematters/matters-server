import type { SQSEvent } from 'aws-lambda'

import { ArchiveUserService } from '#connectors/archiveUserService.js'

import { connections } from '../connections.js'

export const handler = async (event: SQSEvent) => {
  console.log(event.Records)

  const archiveUserService = new ArchiveUserService(connections)

  const results = await Promise.allSettled(
    event.Records.map(async ({ body }: { body: string }) => {
      const { userId } = JSON.parse(body)
      await archiveUserService.archiveUser(userId)
    })
  )
  // print failed reason
  results.map((res) => {
    if (res.status === 'rejected') {
      console.error(res.reason)
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
