import { PaymentQueueJobDataError } from 'common/errors'
import { payToByMattersQueue } from 'connectors/queue'

import { getQueueResult } from './utils'

describe('payToByMattersQueue', () => {
  const queue = payToByMattersQueue
  test('job with wrong tx id will fail', async () => {
    const wrongTxId = { txId: '12345' }
    const job = await queue.payTo(wrongTxId)
    await expect(getQueueResult(queue.q, job.id)).rejects.toThrow(
      PaymentQueueJobDataError
    )
  })
})
