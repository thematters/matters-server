import type { SQSEvent } from 'aws-lambda'

import { LikeCoin } from '#connectors/likecoin/index.js'

import { connections } from '../connections.js'

const likecoin = new LikeCoin(connections)

export const handler = async (event: SQSEvent) => {
  const results = await Promise.allSettled(
    event.Records.map(({ body }: { body: string }) =>
      likecoin.handleLike(JSON.parse(body))
    )
  )

  // print failed reason
  results.map((res: any) => {
    if (res.status === 'rejected') {
      console.error(res.reason)
    }
  })

  // https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#services-sqs-batchfailurereporting
  return {
    batchItemFailures: results
      .map((res: any, index: number) => {
        if (res.status === 'rejected') {
          return { itemIdentifier: event.Records[index].messageId }
        }
      })
      .filter(Boolean),
  }
}
