import Queue from 'bull'

import {
  DB_NOTICE_TYPE,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
  SLACK_MESSAGE_STATE,
} from 'common/enums'
import logger from 'common/logger'
import SlackService from 'connectors/slack'
import { DBNoticeType } from 'definitions'

import { BaseQueue } from './baseQueue'

class EmailsQueue extends BaseQueue {
  slackService: InstanceType<typeof SlackService>

  constructor() {
    super(QUEUE_NAME.emails)

    this.slackService = new SlackService()

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
  }

  private sendDailySummaryEmails: Queue.ProcessCallbackFunction<unknown> =
    async (job, done) => {
      try {
        logger.info(`[schedule job] send daily summary email`)
        const users =
          await this.notificationService.notice.findDailySummaryUsers()

        users.forEach(async (user, index) => {
          const notices =
            await this.notificationService.notice.findDailySummaryNoticesByUser(
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
              user_new_follower: filterNotices(
                DB_NOTICE_TYPE.user_new_follower
              ),
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
              comment_new_reply: filterNotices(
                DB_NOTICE_TYPE.comment_new_reply
              ),
              comment_mentioned_you: filterNotices(
                DB_NOTICE_TYPE.comment_mentioned_you
              ),

              // circle
              circle_invitation: filterNotices(
                DB_NOTICE_TYPE.circle_invitation
              ),
              circle_new_subscriber: filterNotices(
                DB_NOTICE_TYPE.circle_new_subscriber
              ),
              circle_new_follower: filterNotices(
                DB_NOTICE_TYPE.circle_new_follower
              ),
              circle_new_unsubscriber: filterNotices(
                DB_NOTICE_TYPE.circle_new_unsubscriber
              ),
              circle_new_article: filterNotices(
                DB_NOTICE_TYPE.circle_new_article
              ),
              circle_new_broadcast: filterNotices(
                DB_NOTICE_TYPE.circle_new_broadcast
              ),
              circle_new_broadcast_comments: filterNotices(
                DB_NOTICE_TYPE.circle_new_broadcast_comments
              ),
              circle_new_discussion_comments: filterNotices(
                DB_NOTICE_TYPE.circle_new_discussion_comments
              ),
            },
            language: user.language,
          })

          job.progress(((index + 1) / users.length) * 100)
        })

        job.progress(100)
        if (users.length > 0) {
          this.slackService.sendQueueMessage({
            title: `${QUEUE_NAME.emails}:sendDailySummaryEmails`,
            message: `Sent daily summary email to ${users.length} users.`,
            state: SLACK_MESSAGE_STATE.successful,
          })
        }
        done(null, `send daily emails to ${users.length} users`)
      } catch (e) {
        this.slackService.sendQueueMessage({
          title: `${QUEUE_NAME.emails}:sendDailySummaryEmails`,
          message: `Failed to process cron job`,
          state: SLACK_MESSAGE_STATE.failed,
        })
        done(e)
      }
    }
}

export const emailsQueue = new EmailsQueue()
