import Queue from 'bull'

import {
  DAY,
  DB_NOTICE_TYPE,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
  USER_STATE,
} from 'common/enums'
import logger from 'common/logger'
import { getArticleDigest } from 'connectors/notificationService/mail/utils'
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

  private sendChurnEmails: Queue.ProcessCallbackFunction<unknown> = async (
    job,
    done
  ) => {
    try {
      logger.info(`[schedule job] start send churn emails`)

      // get A/B testing group. day time is for group A and night is for group B.
      const group = new Date().getHours() <= 11 ? 'a' : 'b'

      // churn users
      const newRegisterUsers = await this.userService.findLost({
        type: 'new-register',
        group,
      })
      const mediumTermUsers = await this.userService.findLost({
        type: 'medium-term',
        group,
      })
      const totalUsers = newRegisterUsers.length + mediumTermUsers.length

      // top appreciation articles last 30 days
      const monthAgo = new Date(Date.now() - DAY * 30).toISOString()
      const topArticles = await this.articleService.findTopAppreciations({
        limit: 6,
        since: monthAgo,
      })
      const topArticleDigests = await Promise.all(
        topArticles.map(async (article) => getArticleDigest(article))
      )

      if (topArticleDigests.length <= 0) {
        return
      }

      newRegisterUsers.forEach(async (user, index) => {
        const isCommentable = user.state !== USER_STATE.onboarding

        this.notificationService.mail.sendChurn({
          to: user.email,
          recipient: {
            id: user.id,
            displayName: user.displayName,
          },
          language: user.language,
          type: isCommentable
            ? 'newRegisterCommentable'
            : 'newRegisterUncommentable',
          articles: topArticleDigests,
        })

        job.progress(((index + 1) / totalUsers) * 100)
      })

      mediumTermUsers.forEach(async (user, index) => {
        const hasFollowee =
          (
            await this.userService.findFollowees({
              userId: user.id,
              limit: 1,
            })
          ).length >= 1

        // retrieve followeeArticles, or fallback to top appreciation articles
        let articles: any[] = []

        if (hasFollowee) {
          articles = await this.userService.followeeArticles({
            userId: user.id,
            limit: 6,
          })
        }

        if (articles.length <= 0) {
          articles = topArticles
        }

        const articleDigests = await Promise.all(
          articles.map(async (article) => getArticleDigest(article))
        )

        this.notificationService.mail.sendChurn({
          to: user.email,
          recipient: {
            id: user.id,
            displayName: user.displayName,
          },
          language: user.language,
          type: hasFollowee
            ? 'mediumTermHasFollowees'
            : 'mediumTermHasNotFollowees',
          articles: articleDigests,
        })

        job.progress(((index + newRegisterUsers.length + 1) / totalUsers) * 100)
      })

      job.progress(100)
      done(null, `Sent churn emails to ${totalUsers} users`)
    } catch (e) {
      done(e)
    }
  }
}

export const emailsQueue = new EmailsQueue()
