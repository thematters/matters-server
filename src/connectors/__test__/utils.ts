import { Queue } from 'bull'

export const getQueueResult = (q: Queue) => {
  return new Promise((resolve, reject) => {
    q.once('completed', (job, result) => resolve(result))
    q.once('failed', (job, err) => reject(err))
  })
}
