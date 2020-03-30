import Queue from 'bull'

import {
  HOUR,
  MINUTE,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY
} from 'common/enums'
import logger from 'common/logger'
import { refreshView } from 'connectors'
import { MaterializedView } from 'definitions'

import { BaseQueue } from './baseQueue'

class RefreshViewsQueue extends BaseQueue {
  constructor() {
    super(QUEUE_NAME.refreshViews)
    this.addConsumers()
  }

  /**
   * Producers
   */
  addRepeatJobs = async () => {
    // refresh articleActivityMaterialized every 2 minutes, for hottest recommendation
    this.q.add(
      QUEUE_JOB.refreshArticleActivityView,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: {
          every: MINUTE * 2 // every 2 minutes
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
          every: HOUR * 1.1 // every 1.1 hour
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
          every: HOUR * 2.1 // every 2.1 hour
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
          every: MINUTE * 2.5 // every 2.5 minutes
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

export const refreshViewsQueue = new RefreshViewsQueue()
