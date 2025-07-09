import type { SQSEvent } from 'aws-lambda'

import { environment } from '#common/environment.js'
import { genMD5 } from '#common/utils/index.js'
import { NotificationService } from '#connectors/notification/notificationService.js'

import { connections } from '../connections.js'

const deleteNoticeCacheTTL = environment.deleteNoticeCacheTTL
const deduplicationCacheTTL = deleteNoticeCacheTTL
const lockTTL = 10 // 10 seconds

const SKIP_NOTICE_FLAG_PREFIX = 'skip-notice'
const DELETE_NOTICE_KEY_PREFIX = 'delete-notice'
const LOCK_NOTICE_PREFIX = 'lock-notice'

const notificationService = new NotificationService(connections)

export const handler = async (event: SQSEvent) => {
  const redis = connections.redis
  const results = await Promise.allSettled(
    event.Records.map(async ({ body }: { body: string }) => {
      // skip canceled
      console.log(body)
      const params = JSON.parse(body)
      if ('tag' in params) {
        const skipFlag = `${SKIP_NOTICE_FLAG_PREFIX}:${params.tag}`
        if (await redis.exists(skipFlag)) {
          console.info(`Tag ${skipFlag} exists, skipped`)
          return
        }
      }

      // deduplication: skip if notice exists
      const deleteKey = `${DELETE_NOTICE_KEY_PREFIX}:${params.tag}`
      const noticeHashKey = 'notice:' + genMD5(body)
      const [hashKeyExist, deleteKeyExist] = await Promise.all([
        redis.exists(noticeHashKey),
        redis.exists(deleteKey),
      ])
      if (hashKeyExist && deleteKeyExist) {
        console.info(`Notice duplicated, skipped`)
        return
      }

      // lock state operations, prevent `withdraw` at the same time
      const lockKey = `${LOCK_NOTICE_PREFIX}:${params.tag}`
      await redis.set(lockKey, 1, 'EX', lockTTL)

      const notices = await notificationService.process(params)

      // deduplication: set notice hash
      await redis.set(noticeHashKey, 1, 'EX', deduplicationCacheTTL)

      if (notices.length > 0 && 'tag' in params) {
        Promise.all(
          notices.map(async (notice) => {
            redis.sadd(deleteKey, notice.id)
            redis.expire(deleteKey, deleteNoticeCacheTTL)
          })
        )
      }
      await redis.del(lockKey)
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
