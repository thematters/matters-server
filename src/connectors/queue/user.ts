import type { Connections } from 'definitions'
import type { Redis } from 'ioredis'

import Queue from 'bull'

import {
  OFFICIAL_NOTICE_EXTEND_TYPE,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
  QUEUE_URL,
  USER_STATE,
} from 'common/enums'
import { getLogger } from 'common/logger'
import { aws, UserService, AtomService, NotificationService } from 'connectors'

import { BaseQueue } from './baseQueue'

const logger = getLogger('queue-user')

interface ArchiveUserData {
  userId: string
}

export class UserQueue extends BaseQueue {
  constructor(queueRedis: Redis, connections: Connections) {
    super(QUEUE_NAME.user, queueRedis, connections)
    this.addConsumers()
  }

  /**
   * Producers
   */
  public addRepeatJobs = async () => {
    // unban user every day at 00:00
    this.q.add(
      QUEUE_JOB.unbanUsers,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: { cron: '0 0 * * *', tz: 'Asia/Hong_Kong' },
      }
    )
  }

  /**
   * Producers
   */
  public archiveUser = (data: ArchiveUserData) =>
    aws.sqsSendMessage({
      messageBody: data,
      queueUrl: QUEUE_URL.archiveUser,
    })

  /**
   * Cusumers
   */
  private addConsumers = () => {
    this.q.process(QUEUE_JOB.unbanUsers, this.unbanUsers)
  }

  /**
   * Unban users.
   */
  private unbanUsers: Queue.ProcessCallbackFunction<unknown> = async (
    job,
    done
  ) => {
    const userService = new UserService(this.connections)
    const atomService = new AtomService(this.connections)
    const notificationService = new NotificationService(this.connections)
    try {
      const records = await userService.findPunishRecordsByTime({
        state: USER_STATE.banned,
        archived: false,
        expiredAt: new Date(Date.now()).toISOString(),
      })
      const users: Array<string | number> = []

      await Promise.all(
        records.map(async (record, index) => {
          try {
            const data = {
              state: USER_STATE.active,
            }

            await atomService.update({
              table: 'user',
              where: { id: record.userId },
              data,
            })

            await userService.baseUpdate(
              record.id,
              { archived: true },
              'punish_record'
            )
            notificationService.trigger({
              event: OFFICIAL_NOTICE_EXTEND_TYPE.user_unbanned,
              recipientId: record.userId,
            })
            users.push(record.userId)
            job.progress(((index + 1) / records.length) * 100)
          } catch (err: any) {
            logger.error(err)
          }
        })
      )

      done(null, users)
    } catch (err: any) {
      done(err)
    }
  }
}
