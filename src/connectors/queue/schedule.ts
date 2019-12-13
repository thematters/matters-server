import Queue from 'bull'

import {
  MATERIALIZED_VIEW,
  PUBLISH_STATE,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY
} from 'common/enums'
import logger from 'common/logger'
import {
  ArticleService,
  DraftService,
  NotificationService,
  refreshView,
  UserService
} from 'connectors'
import { MaterializedView } from 'definitions'

import { publicationQueue } from './publication'
import { createQueue } from './utils'

class ScheduleQueue {
  q: InstanceType<typeof Queue>
  draftService: InstanceType<typeof DraftService>
  userService: InstanceType<typeof UserService>
  articleService: InstanceType<typeof ArticleService>
  notificationService: InstanceType<typeof NotificationService>

  private queueName = QUEUE_NAME.schedule

  constructor() {
    this.notificationService = new NotificationService()
    this.draftService = new DraftService()
    this.userService = new UserService()
    this.articleService = new ArticleService()
  }

  start = async () => {
    this.q = createQueue(this.queueName)
    this.addConsumers()
    await this.clearDelayedJobs()
    await this.addRepeatJobs()
  }

  /**
   * Producers
   */
  clearDelayedJobs = async () => {
    try {
      const jobs = await this.q.getDelayed()
      jobs.forEach(async job => {
        await job.remove()
      })
    } catch (e) {
      logger.error('failed to clear repeat jobs', e)
    }
  }

  addRepeatJobs = async () => {
    // publish pending draft every 20 minutes
    this.q.add(
      QUEUE_JOB.publishPendingDrafts,
      {},
      {
        priority: QUEUE_PRIORITY.HIGH,
        repeat: {
          every: 1000 * 60 * 20 // every 20 mins
        }
      }
    )

    // send daily summary email every day at 09:00
    this.q.add(
      QUEUE_JOB.sendDailySummaryEmail,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: { cron: '0 9 * * *', tz: 'Asia/Hong_Kong' }
      }
    )

    // activate onboarding users every day at 00:00
    this.q.add(
      QUEUE_JOB.activateOnboardingUsers,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: { cron: '0 0 * * *', tz: 'Asia/Hong_Kong' }
      }
    )

    /**
     * Refresh Views
     */
    // refresh articleActivityMaterialized every 2 minutes, for hottest recommendation
    this.q.add(
      QUEUE_JOB.refreshArticleActivityView,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: {
          every: 1000 * 60 * 2 // every 2 minutes
        }
      }
    )

    // refresh articleCountMaterialized every 1.1 hours, for topics recommendation
    this.q.add(
      QUEUE_JOB.refreshArticleCountView,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: {
          every: 1000 * 60 * 60 * 1.1 // every 1.1 hour
        }
      }
    )

    // refresh featuredCommentMaterialized every 2.1 hours, for featured comments
    this.q.add(
      QUEUE_JOB.refreshFeaturedCommentView,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: {
          every: 1000 * 60 * 60 * 2.1 // every 2.1 hour
        }
      }
    )

    // refresh tagCountMaterialized every 2.5 minutes
    this.q.add(
      QUEUE_JOB.refreshTagCountMaterialView,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: {
          every: 1000 * 60 * 2.5 // every 2.5 minutes
        }
      }
    )

    // refresh userReaderMaterialized every day at 3am
    this.q.add(
      QUEUE_JOB.refreshUserReaderView,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: { cron: '0 3 * * *', tz: 'Asia/Hong_Kong' }
      }
    )
  }

  /**
   * Cusumers
   */
  private addConsumers = () => {
    // publish pending drafs
    this.q.process(
      QUEUE_JOB.publishPendingDrafts,
      this.handlePublishPendingDrafts
    )

    // send daily summary email
    this.q.process(
      QUEUE_JOB.sendDailySummaryEmail,
      this.handleSendDailySummaryEmail
    )

    // activate onboarding users
    this.q.process(
      QUEUE_JOB.activateOnboardingUsers,
      this.handleActivateOnboardingUsers
    )

    // refresh view
    this.q.process(
      QUEUE_JOB.refreshArticleActivityView,
      this.handleRefreshView('article_activity_materialized')
    )
    this.q.process(
      QUEUE_JOB.refreshArticleCountView,
      this.handleRefreshView('article_count_materialized')
    )
    this.q.process(
      QUEUE_JOB.refreshFeaturedCommentView,
      this.handleRefreshView('featured_comment_materialized')
    )
    this.q.process(
      QUEUE_JOB.refreshTagCountMaterialView,
      this.handleRefreshView('tag_count_materialized')
    )
    this.q.process(
      QUEUE_JOB.refreshUserReaderView,
      this.handleRefreshView('user_reader_materialized')
    )
  }

  private handlePublishPendingDrafts: Queue.ProcessCallbackFunction<
    unknown
  > = async (job, done) => {
    try {
      const drafts = await this.draftService.findByPublishState(
        PUBLISH_STATE.pending
      )
      const pendingDraftIds: string[] = []

      drafts.forEach((draft: any, index: number) => {
        // skip if draft was scheduled and later than now
        if (draft.scheduledAt && draft.scheduledAt > new Date()) {
          return
        }
        publicationQueue.publishArticle({ draftId: draft.id, delay: 0 })
        pendingDraftIds.push(draft.id)
        job.progress(((index + 1) / drafts.length) * 100)
      })

      job.progress(100)
      done(null, pendingDraftIds)
    } catch (e) {
      done(e)
    }
  }

  private handleSendDailySummaryEmail: Queue.ProcessCallbackFunction<
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

  private handleActivateOnboardingUsers = (): Queue.ProcessCallbackFunction<
    unknown
  > => async (job, done) => {
    const activatableUsers = await this.userService.findActivatableUsers()

    await Promise.all(
      activatableUsers.map(async user => {
        try {
          await this.userService.activate({ id: user.id })
        } catch (e) {
          logger.error(e)
        }
      })
    )
  }

  private handleRefreshView = (
    view: MaterializedView
  ): Queue.ProcessCallbackFunction<unknown> => async (job, done) => {
    try {
      logger.info(`[schedule job] refreshing view ${view}`)
      await refreshView(view)
      job.progress(100)
      done(null)
    } catch (e) {
      logger.error(
        `[schedule job] error in refreshing view ${view}: ${JSON.stringify(e)}`
      )
      done(e)
    }
  }
}

export const scheduleQueue = new ScheduleQueue()
