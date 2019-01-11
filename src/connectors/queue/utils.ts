// external
import Queue from 'bull'
import Redis from 'ioredis'
// internal
import { environment } from 'common/environment'

export const sharedQueueOpts = {
  // Reusing Redis Connections
  createClient() {
    return new Redis({
      host: environment.queueHost as string,
      port: environment.queuePort as number
    })
  }
}

export const createQueue = (queueName: string) => {
  const queue = new Queue(queueName, sharedQueueOpts)

  queue.on('error', error => {
    // An error occured.
    console.error(`Job errored.`)
    console.log(error)
  })

  queue.on('waiting', jobId => {
    // A Job is waiting to be processed as soon as a worker is idling.
    console.log(`Job#${jobId} is waiting.`)
  })

  queue.on('active', (job, jobPromise) => {
    // A job has started. You can use `jobPromise.cancel()`` to abort it.
    console.log(`Job#${job.id} has started.`)
  })

  queue.on('stalled', job => {
    // A job has been marked as stalled. This is useful for debugging job
    // workers that crash or pause the event loop.
    console.error(`Job#${job.id} stalled, processing again.`)
    console.error({ job })
  })

  queue.on('progress', (job, progress) => {
    // A job's progress was updated!
    console.log(`Job#${job.id} progress was updated: ${progress}.`)
  })

  queue.on('completed', (job, result) => {
    // A job successfully completed with a `result`.
    console.log(`Job#${job.id} has been completed: ${JSON.stringify(result)}.`)
  })

  queue.on('failed', (job, err) => {
    // A job failed with reason `err`!
    console.error(`Job#${job.id} failed, with following reason.`)
    console.error({ job, err })
  })

  queue.on('paused', () => {
    // The queue has been paused.
    console.log('The queue has been paused.')
  })

  queue.on('resumed', () => {
    // The queue has been resumed.
    console.log('The queue has been resumed.')
  })

  queue.on('cleaned', (jobs, type) => {
    // Old jobs have been cleaned from the queue. `jobs` is an array of cleaned
    // jobs, and `type` is the type of jobs cleaned.
    console.log(`Jobs (${jobs.map(job => `#${job.id}`)} have been cleaned.`)
  })

  queue.on('drained', () => {
    // Emitted every time the queue has processed all the waiting jobs
    // (even if there can be some delayed jobs not yet processed)
  })

  queue.on('removed', job => {
    // A job successfully removed.
    console.log(`Job#${job.id} has been removed.`)
  })

  return queue
}
