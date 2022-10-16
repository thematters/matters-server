import { Queue } from 'bull'

// import { PaymentService } from 'connectors'
import { payToByMattersQueue } from 'connectors/queue'

const getQueueResult = (q: Queue) => {
  return new Promise((resolve, reject) => {
    q.once('completed', (job, result) => resolve(result))
    q.once('failed', (job, err) => reject(err))
  })
}

describe('payToQueue', () => {
  test('wrong tx id will throw error', async () => {
    const wrongTxId = { txId: '12345' }
    payToByMattersQueue.payTo(wrongTxId)
    await expect(getQueueResult(payToByMattersQueue.q)).rejects.toThrow()
  })
})
