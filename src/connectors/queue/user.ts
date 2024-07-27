import type { Queue, ProcessCallbackFunction } from 'bull'
import type { Connections, PunishRecord } from 'definitions'

import {
  OFFICIAL_NOTICE_EXTEND_TYPE,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
  QUEUE_URL,
  USER_STATE,
} from 'common/enums'
import { isTest } from 'common/environment'
import { getLogger } from 'common/logger'
import { aws, UserService, AtomService, NotificationService } from 'connectors'

import { getOrCreateQueue } from './utils'

const logger = getLogger('queue-user')

interface ArchiveUserData {
  userId: string
}

export class UserQueue {
  private connections: Connections
  private q: Queue
  public constructor(connections: Connections) {
    this.connections = connections
    const [q, created] = getOrCreateQueue(QUEUE_NAME.user)
    this.q = q
    if (created) {
      this.addConsumers()
      this.startScheduledJobs()
    }
  }

  /**
   * Producers
   */
  private addRepeatJobs = async () => {
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
   * Start scheduled jobs
   */
  private startScheduledJobs = async () => {
    await this.clearDelayedJobs()
    if (!isTest) {
      this.addRepeatJobs()
    }
  }

  /**
   * Producers
   */
  private clearDelayedJobs = async () => {
    try {
      const jobs = await this.q.getDelayed()
      jobs.forEach(async (job) => {
        try {
          await job.remove()
        } catch (e) {
          logger.error('failed to clear repeat jobs', e)
        }
      })
    } catch (e) {
      logger.error('failed to clear repeat jobs', e)
    }
  }

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
  private unbanUsers: ProcessCallbackFunction<unknown> = async (job, done) => {
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

            await userService.baseUpdate<PunishRecord>(
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
            // eslint-disable-next-line  @typescript-eslint/no-explicit-any
          } catch (err: any) {
            logger.error(err)
          }
        })
      )

      done(null, users)
      // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    } catch (err: any) {
      done(err)
    }
  }
}
