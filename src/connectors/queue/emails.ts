import Queue from 'bull'

import { QUEUE_JOB, QUEUE_NAME, QUEUE_PRIORITY } from 'common/enums'
import logger from 'common/logger'

import { BaseQueue } from './baseQueue'

class EmailsQueue extends BaseQueue {
  constructor() {
    super(QUEUE_NAME.emails)
    this.addConsumers()
  }

  /**
   * Producers
   */
  addRepeatJobs = async () => {
    // send daily summary email every day at 09:00
    this.q.add(
      QUEUE_JOB.sendDailySummaryEmails,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: { cron: '0 9 * * *', tz: 'Asia/Hong_Kong' }
      }
    )

    // send churn emails, check every day at 00:00
    this.q.add(
      QUEUE_JOB.sendChurnEmails,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: { cron: '0 0 * * *', tz: 'Asia/Hong_Kong' }
      }
    )
  }

  /**
   * Cusumers
   */
  private addConsumers = () => {
    // send daily summary email
    this.q.process(
      QUEUE_JOB.sendDailySummaryEmails,
      this.sendDailySummaryEmails
    )

    // send churn emails
    this.q.process(QUEUE_JOB.sendChurnEmails, this.sendChurnEmails)
  }

  private sendDailySummaryEmails: Queue.ProcessCallbackFunction<
    unknown
  > = async (job, done) => {
    try {
      logger.info(`[schedule job] send daily summary email`)
      const users = await this.notificationService.notice.findDailySummaryUsers()

      users.forEach(async (user, index) => {
        const notices = await this.notificationService.notice.findDailySummaryNoticesByUser(
          user.id
        )

        if (!notices || notices.length <= 0) {
          return
        }

        const filterNotices = (type: string) =>
          notices.filter(notice => notice.noticeType === type)

        this.notificationService.mail.sendDailySummary({
          to: user.email,
          recipient: {
            displayName: user.displayName
          },
          notices: {
            user_new_follower: filterNotices('user_new_follower'),
            article_new_collected: filterNotices('article_new_collected'),
            article_new_appreciation: filterNotices('article_new_appreciation'),
            article_new_subscriber: filterNotices('article_new_subscriber'),
            article_new_comment: filterNotices('article_new_comment'),
            article_mentioned_you: filterNotices('article_mentioned_you'),
            comment_new_reply: filterNotices('comment_new_reply'),
            comment_mentioned_you: filterNotices('comment_mentioned_you')
          },
          language: user.language
        })

        job.progress(((index + 1) / users.length) * 100)
      })

      job.progress(100)
      done(null)
    } catch (e) {
      done(e)
    }
  }

  private sendChurnEmails: Queue.ProcessCallbackFunction<unknown> = async (
    job,
    done
  ) => {
    try {
      logger.info(`[schedule job] send churn emails`)

      const newRegisterUsers = await this.userService.findLost({
        type: 'new-register'
      })
      const mediumTermUsers = await this.userService.findLost({
        type: 'medium-term'
      })

      console.log({ newRegisterUsers, mediumTermUsers })

      job.progress(100)
      done(null)
    } catch (e) {
      done(e)
    }
  }
}

export const emailsQueue = new EmailsQueue()
