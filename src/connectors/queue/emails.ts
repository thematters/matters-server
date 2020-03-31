import Queue from 'bull'

import {
  DAY,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
  USER_STATE
} from 'common/enums'
import logger from 'common/logger'
import { getArticleDigest } from 'connectors/notificationService/mail/utils'

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
      logger.info(`[schedule job] start send churn emails`)

      // churn users
      const newRegisterUsers = await this.userService.findLost({
        type: 'new-register'
      })
      const mediumTermUsers = await this.userService.findLost({
        type: 'medium-term'
      })
      const totalUsers = newRegisterUsers.length + mediumTermUsers.length

      logger.info(`[schedule job] send churn emails to ${totalUsers} users`)

      // top appreciation articles last 30 days
      const monthAgo = new Date(Date.now() - DAY * 30).toISOString()
      const topArticles = await this.articleService.findTopAppreciations({
        limit: 6,
        since: monthAgo
      })
      const topArticleDigests = await Promise.all(
        topArticles.map(async article => getArticleDigest(article))
      )

      if (topArticleDigests.length <= 0) {
        return
      }

      newRegisterUsers.forEach(async (user, index) => {
        const isCommentable = user.state !== USER_STATE.onboarding

        this.notificationService.mail.sendChurn({
          to: user.email,
          recipient: {
            displayName: user.displayName
          },
          language: user.language,
          type: isCommentable
            ? 'newRegisterCommentable'
            : 'newRegisterUncommentable',
          articles: topArticleDigests
        })

        job.progress(((index + 1) / totalUsers) * 100)
      })

      mediumTermUsers.forEach(async (user, index) => {
        const hasFollowee =
          (
            await this.userService.findFollowees({
              userId: user.id,
              limit: 1
            })
          ).length >= 1

        this.notificationService.mail.sendChurn({
          to: user.email,
          recipient: {
            displayName: user.displayName
          },
          language: user.language,
          type: hasFollowee
            ? 'mediumTermHasFollowees'
            : 'mediumTermHasNotFollowees',
          articles: topArticleDigests
        })

        job.progress(((index + newRegisterUsers.length + 1) / totalUsers) * 100)
      })

      job.progress(100)
      done(null)
    } catch (e) {
      done(e)
    }
  }
}

export const emailsQueue = new EmailsQueue()
