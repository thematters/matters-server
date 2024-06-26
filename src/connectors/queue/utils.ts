import Queue, { RateLimiter } from 'bull'
import Redis from 'ioredis'

import { QUEUE_COMPLETED_LIST_SIZE } from 'common/enums'
import { environment, isTest } from 'common/environment'
import { getLogger } from 'common/logger'
import { genRandomString } from 'common/utils'

const logger = getLogger('queue-base')

export interface CustomQueueOpts {
  limiter?: RateLimiter
}

const redisClientMap = new Map()
const queueMap = new Map()

/**
 * get or create queue instance
 *
 * @remarks  As not all redis clients are shared between queues,
 * to avoid memory leak, we should reuse the same queue instance.
 *
 * @return [queue, created]
 */
export const getOrCreateQueue = (
  queueName: string,
  customOpts?: CustomQueueOpts
): [InstanceType<typeof Queue>, boolean] => {
  const _queueName = isTest
    ? `test-${queueName}-${genRandomString()}`
    : queueName

  if (queueMap.has(_queueName)) {
    return [queueMap.get(_queueName), false]
  }
  const queue = createQueue(_queueName, customOpts)
  queueMap.set(_queueName, queue)
  return [queue, true]
}

export const createQueue = (
  queueName: string,
  customOpts?: CustomQueueOpts
) => {
  const queue = new Queue(queueName, {
    createClient,
    defaultJobOptions: {
      removeOnComplete: QUEUE_COMPLETED_LIST_SIZE.small,
    },
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

  queue.on('active', (job) => {
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

  queue.on('cleaned', (jobs) => {
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

// reuse 'client'/'subscriber' redis client instance only,
// see https://github.com/OptimalBits/bull/blob/master/PATTERNS.md#reusing-redis-connections
const createClient = (type: string) => {
  if (redisClientMap.has(type)) {
    return redisClientMap.get(type)
  }
  const config = {
    host: environment.queueHost,
    port: environment.queuePort,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  }
  const redis = new Redis(config)
  if (['client', 'subscriber'].includes(type)) {
    redisClientMap.set(type, redis)
  }
  return redis
}
