import { Queue } from 'bull'

export const getQueueResult = (q: Queue, jobId: number | string) => {
  return new Promise((resolve, reject) => {
    q.on('completed', (job, result) => {
      if (job.id === jobId) {
        resolve(result)
      }
    })
    q.on('failed', (job, err) => {
      if (job.id === jobId) {
        reject(err)
      }
    })
  })
}
