import Queue, { RateLimiter } from 'bull'
import Redis from 'ioredis'

import { QUEUE_COMPLETED_LIST_SIZE } from 'common/enums'
import { environment } from 'common/environment'
import { getLogger } from 'common/logger'

const logger = getLogger('queue-base')

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
    logger.error(`Job errored:`, error)
  })

  queue.on('waiting', (jobId) => {
    // A Job is waiting to be processed as soon as a worker is idling.
    logger.debug(`Job#%s is waiting.`, jobId)
  })

  queue.on('active', (job, _) => {
    // A job has started. You can use `jobPromise.cancel()`` to abort it.
    logger.info(`Job#%s/%s has started.`, job.id, job.name)
  })

  queue.on('stalled', (job) => {
    // A job has been marked as stalled. This is useful for debugging job
    // workers that crash or pause the event loop.
    logger.error(`Job#${job.id} stalled, processing again.`)
  })

  queue.on('progress', (job, progress) => {
    // A job's progress was updated!
    logger.debug(
      'Job#%s/%s progress was updated: %d.',
      job.id,
      job.name,
      progress
    )
  })

  queue.on('completed', (job, result) => {
    // A job successfully completed with a `result`.
    logger.info('Job#%s/%s has been completed: %j.', job.id, job.name, result)
  })

  queue.on('failed', (job, err) => {
    // A job failed with reason `err`!
    logger.error('Job#%s failed: %j', job.id, { job, err })
  })

  queue.on('paused', () => {
    // The queue has been paused.
    logger.info('The queue has been paused.')
  })

  queue.on('resumed', () => {
    // The queue has been resumed.
    logger.info('The queue has been resumed.')
  })

  queue.on('cleaned', (jobs, _) => {
    // Old jobs have been cleaned from the queue. `jobs` is an array of cleaned
    // jobs, and `type` is the type of jobs cleaned.
    logger.info(
      `Jobs (%s) have been cleaned.`,
      jobs.map((job) => `#${job.id}`)
    )
  })

  queue.on('drained', () => {
    // Emitted every time the queue has processed all the waiting jobs
    // (even if there can be some delayed jobs not yet processed)
  })

  queue.on('removed', (job) => {
    // A job successfully removed.
    logger.info('Job#%s/%s has been removed.', job.id, job.name)
  })

  return queue
}
