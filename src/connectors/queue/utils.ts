import Queue, { RateLimiter } from 'bull'
import Redis from 'ioredis'

import { QUEUE_COMPLETED_LIST_SIZE } from 'common/enums'
import { environment } from 'common/environment'
import logger from 'common/logger'

export interface CustomQueueOpts {
  limiter?: RateLimiter
}

export const sharedQueueOpts = {
  // Reusing Redis Connections
  createClient() {
    return new Redis({
      host: environment.queueHost,
      port: environment.queuePort,
    })
  },
  defaultJobOptions: {
    removeOnComplete: QUEUE_COMPLETED_LIST_SIZE.small,
  },
}

export const createQueue = (
  queueName: string,
  customOpts?: CustomQueueOpts
) => {
  const queue = new Queue(queueName, {
    ...sharedQueueOpts,
    ...(customOpts || {}),
  })

  queue.on('error', (error) => {
    // An error occured.
    logger.error(`Job errored.`)
    logger.info(error)
  })

  queue.on('waiting', (jobId) => {
    // A Job is waiting to be processed as soon as a worker is idling.
    // logger.info(`Job#${jobId} is waiting.`)
  })

  queue.on('active', (job, jobPromise) => {
    // A job has started. You can use `jobPromise.cancel()`` to abort it.
    // logger.info(`Job#${job.id} has started.`)
  })

  queue.on('stalled', (job) => {
    // A job has been marked as stalled. This is useful for debugging job
    // workers that crash or pause the event loop.
    logger.error(`Job#${job.id} stalled, processing again.`)
    logger.error({ job })
  })

  queue.on('progress', (job, progress) => {
    // A job's progress was updated!
    // logger.info(`Job#${job.id} progress was updated: ${progress}.`)
  })

  queue.on('completed', (job, result) => {
    // A job successfully completed with a `result`.
    // logger.info(`Job#${job.id} has been completed: ${JSON.stringify(result)}.`)
  })

  queue.on('failed', (job, err) => {
    // A job failed with reason `err`!
    logger.error(`Job#${job.id} failed, with following reason.`)
    logger.error({ job, err })
  })

  queue.on('paused', () => {
    // The queue has been paused.
    // logger.info('The queue has been paused.')
  })

  queue.on('resumed', () => {
    // The queue has been resumed.
    // logger.info('The queue has been resumed.')
  })

  queue.on('cleaned', (jobs, type) => {
    // Old jobs have been cleaned from the queue. `jobs` is an array of cleaned
    // jobs, and `type` is the type of jobs cleaned.
    // logger.info(`Jobs (${jobs.map((job) => `#${job.id}`)} have been cleaned.`)
  })

  queue.on('drained', () => {
    // Emitted every time the queue has processed all the waiting jobs
    // (even if there can be some delayed jobs not yet processed)
  })

  queue.on('removed', (job) => {
    // A job successfully removed.
    // logger.info(`Job#${job.id} has been removed.`)
  })

  return queue
}
