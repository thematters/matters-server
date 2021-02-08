import Queue from 'bull'

import {
  DAY,
  HOUR,
  MINUTE,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
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
    // refresh refreshArticleValueMaterialized every 2 minutes, for hottest recommendation
    this.q.add(
      QUEUE_JOB.refreshArticleValueView,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: {
          every: MINUTE * 1.9, // every 1.9 minutes
        },
      }
    )

    // refresh articleCountMaterialized every 3.1 minutes, for topics recommendation
    this.q.add(
      QUEUE_JOB.refreshArticleCountView,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: {
          every: MINUTE * 3.1, // every 3.1 minutes
        },
      }
    )

    // refresh featuredCommentMaterialized every 2.1 hours, for featured comments
    this.q.add(
      QUEUE_JOB.refreshFeaturedCommentView,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: {
          every: HOUR * 2.1, // every 2.1 hour
        },
      }
    )

    // refresh tagCountMaterialized every 5.1 minutes
    this.q.add(
      QUEUE_JOB.refreshTagCountMaterialView,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: {
          every: MINUTE * 5.1, // every 5.1 minutes
        },
      }
    )

    // refresh curationTagMaterialized every 3 minutes
    this.q.add(
      QUEUE_JOB.refreshCurationTagMaterialView,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: {
          every: MINUTE * 3, // every 3 minutes
        },
      }
    )

    // refresh userReaderMaterialized every day at 3am
    this.q.add(
      QUEUE_JOB.refreshUserReaderView,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: { cron: '0 3 * * *', tz: 'Asia/Hong_Kong' },
      }
    )

    // refresh articleInterestMaterialized every day at 2am
    this.q.add(
      QUEUE_JOB.refreshArticleInterestView,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: { cron: '0 2 * * *', tz: 'Asia/Hong_Kong' },
      }
    )

    // refresh articleHottestMaterialized every 2 minutes, for hottest recommendation
    this.q.add(
      QUEUE_JOB.refreshArticleHottestView,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: {
          every: MINUTE * 2.3, // every 2.3 minutes
        },
      }
    )

    // refresh most active author view every 6 hours
    this.q.add(
      QUEUE_JOB.refreshMostActiveAuthorView,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: {
          every: HOUR * 6, // every 6 hours
        },
      }
    )

    // refresh most appreciated authors view every 6.1 hours
    this.q.add(
      QUEUE_JOB.refreshMostAppreciatedAuthorView,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: {
          every: HOUR * 6.1, // every 6.1 hours
        },
      }
    )

    // refresh most trendy authors view every 6.2 hours
    this.q.add(
      QUEUE_JOB.refreshMostTrendyAuthorView,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: {
          every: HOUR * 6.2, // every 6.2 hours
        },
      }
    )
  }

  /**
   * Cusumers
   */
  private addConsumers = () => {
    this.q.process(
      QUEUE_JOB.refreshArticleValueView,
      this.handleRefreshView('article_value_materialized')
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
    this.q.process(
      QUEUE_JOB.refreshArticleInterestView,
      this.handleRefreshView('article_interest_materialized')
    )
    this.q.process(
      QUEUE_JOB.refreshCurationTagMaterialView,
      this.handleRefreshView('curation_tag_materialized')
    )
    this.q.process(
      QUEUE_JOB.refreshArticleHottestView,
      this.handleRefreshView('article_hottest_materialized')
    )
    this.q.process(
      QUEUE_JOB.refreshMostActiveAuthorView,
      this.handleRefreshView('most_active_author_materialized')
    )
    this.q.process(
      QUEUE_JOB.refreshMostAppreciatedAuthorView,
      this.handleRefreshView('most_appreciated_author_materialized')
    )
    this.q.process(
      QUEUE_JOB.refreshMostTrendyAuthorView,
      this.handleRefreshView('most_trendy_author_materialized')
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
