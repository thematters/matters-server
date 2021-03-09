import Queue from 'bull'

import {
  DB_NOTICE_TYPE,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
} from 'common/enums'
import logger from 'common/logger'
import { DBNoticeType } from 'definitions'

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
        repeat: { cron: '0 9 * * *', tz: 'Asia/Hong_Kong' },
      }
    )

    // send churn emails, check every day at 08:00 and 20:00
    // this.q.add(
    //   QUEUE_JOB.sendChurnEmails,
    //   {},
    //   {
    //     priority: QUEUE_PRIORITY.MEDIUM,
    //     repeat: { cron: '0 8,20 * * *', tz: 'Asia/Hong_Kong' },
    //   }
    // )
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
    // this.q.process(QUEUE_JOB.sendChurnEmails, this.sendChurnEmails)
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

        const filterNotices = (type: DBNoticeType) =>
          notices.filter((notice) => notice.noticeType === type)

        this.notificationService.mail.sendDailySummary({
          to: user.email,
          recipient: {
            displayName: user.displayName,
          },
          notices: {
            user_new_follower: filterNotices(DB_NOTICE_TYPE.user_new_follower),
            article_new_collected: filterNotices(
              DB_NOTICE_TYPE.article_new_collected
            ),
            article_new_appreciation: filterNotices(
              DB_NOTICE_TYPE.article_new_appreciation
            ),
            article_new_subscriber: filterNotices(
              DB_NOTICE_TYPE.article_new_subscriber
            ),
            article_new_comment: filterNotices(
              DB_NOTICE_TYPE.article_new_comment
            ),
            article_mentioned_you: filterNotices(
              DB_NOTICE_TYPE.article_mentioned_you
            ),
            comment_new_reply: filterNotices(DB_NOTICE_TYPE.comment_new_reply),
            comment_mentioned_you: filterNotices(
              DB_NOTICE_TYPE.comment_mentioned_you
            ),
          },
          language: user.language,
        })

        job.progress(((index + 1) / users.length) * 100)
      })

      job.progress(100)
      done(null, `send daily emails to ${users.length} users`)
    } catch (e) {
      done(e)
    }
  }
}

export const emailsQueue = new EmailsQueue()
