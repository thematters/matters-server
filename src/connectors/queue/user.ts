import Queue from 'bull'

import {
  MINUTE,
  OFFICIAL_NOTICE_EXTEND_TYPE,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
  QUEUE_URL,
  USER_STATE,
} from 'common/enums'
import { getLogger } from 'common/logger'
import { aws } from 'connectors'

import { BaseQueue } from './baseQueue'

const logger = getLogger('queue-user')

interface ArchiveUserData {
  userId: string
}

class UserQueue extends BaseQueue {
  constructor() {
    super(QUEUE_NAME.user)
    this.addConsumers()
  }

  /**
   * Producers
   */
  addRepeatJobs = async () => {
    // activate onboarding users every 2 minutes
    this.q.add(
      QUEUE_JOB.activateOnboardingUsers,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: {
          every: MINUTE * 20, // every 20 minutes
        },
      }
    )

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
  archiveUser = (data: ArchiveUserData) =>
    aws.sqsSendMessage({
      messageBody: data,
      queueUrl: QUEUE_URL.archiveUser,
    })

  /**
   * Cusumers
   */
  private addConsumers = () => {
    // activate onboarding users
    this.q.process(
      QUEUE_JOB.activateOnboardingUsers,
      this.activateOnboardingUsers
    )

    this.q.process(QUEUE_JOB.unbanUsers, this.unbanUsers)
  }

  /**
   * Activate onboarding users
   */
  private activateOnboardingUsers: Queue.ProcessCallbackFunction<unknown> =
    async (job, done) => {
      try {
        const activatableUsers = await this.userService.findActivatableUsers()
        const activatedUsers: Array<string | number> = []

        await Promise.all(
          activatableUsers.map(async (user, index) => {
            try {
              await this.userService.activate({ id: user.id })
              this.notificationService.trigger({
                event: OFFICIAL_NOTICE_EXTEND_TYPE.user_activated,
                recipientId: user.id,
              })
              activatedUsers.push(user.id)
              job.progress(((index + 1) / activatableUsers.length) * 100)
            } catch (e) {
              logger.error(e)
            }
          })
        )

        done(null, activatedUsers)
      } catch (e) {
        done(e)
      }
    }

  /**
   * Unban users.
   */
  private unbanUsers: Queue.ProcessCallbackFunction<unknown> = async (
    job,
    done
  ) => {
    try {
      const records = await this.userService.findPunishRecordsByTime({
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

            await this.atomService.update({
              table: 'user',
              where: { id: record.userId },
              data,
            })

            await this.userService.baseUpdate(
              record.id,
              { archived: true },
              'punish_record'
            )
            this.notificationService.trigger({
              event: OFFICIAL_NOTICE_EXTEND_TYPE.user_unbanned,
              recipientId: record.userId,
            })
            users.push(record.userId)
            job.progress(((index + 1) / records.length) * 100)
          } catch (e) {
            logger.error(e)
          }
        })
      )

      done(null, users)
    } catch (e) {
      done(e)
    }
  }
}

export const userQueue = new UserQueue()
