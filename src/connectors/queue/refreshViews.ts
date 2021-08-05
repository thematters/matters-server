import Queue from 'bull'

import {
  HOUR,
  MATERIALIZED_VIEW,
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

    // refresh user activity view every 3 minutes
    this.q.add(
      QUEUE_JOB.refreshUserActivityView,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: {
          every: MINUTE * 3,
        },
      }
    )

    // refresh user recently read tags view every 6 hours
    this.q.add(
      QUEUE_JOB.refreshRecentlyReadTagsView,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: {
          every: HOUR * 6,
        },
      }
    )

    // refresh article read time view every 1 hours
    this.q.add(
      QUEUE_JOB.refreshArticleReadTimeView,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: {
          every: HOUR * 1,
        },
      }
    )

    // refresh recommended articles from read tags view every 12 hours
    this.q.add(
      QUEUE_JOB.refreshRecommendedArticlesFromReadTagsView,
      {},
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: {
          every: HOUR * 12,
        },
      }
    )
  }

  /**
   * Cusumers
   */
  private addConsumers = () => {
    this.q.process(
      QUEUE_JOB.refreshFeaturedCommentView,
      this.handleRefreshView(MATERIALIZED_VIEW.featured_comment_materialized)
    )
    this.q.process(
      QUEUE_JOB.refreshTagCountMaterialView,
      this.handleRefreshView(MATERIALIZED_VIEW.tag_count_materialized)
    )
    this.q.process(
      QUEUE_JOB.refreshUserReaderView,
      this.handleRefreshView(MATERIALIZED_VIEW.user_reader_materialized)
    )
    this.q.process(
      QUEUE_JOB.refreshCurationTagMaterialView,
      this.handleRefreshView(MATERIALIZED_VIEW.curation_tag_materialized)
    )
    this.q.process(
      QUEUE_JOB.refreshArticleHottestView,
      this.handleRefreshView(MATERIALIZED_VIEW.article_hottest_materialized)
    )
    this.q.process(
      QUEUE_JOB.refreshMostActiveAuthorView,
      this.handleRefreshView(MATERIALIZED_VIEW.most_active_author_materialized)
    )
    this.q.process(
      QUEUE_JOB.refreshMostAppreciatedAuthorView,
      this.handleRefreshView(
        MATERIALIZED_VIEW.most_appreciated_author_materialized
      )
    )
    this.q.process(
      QUEUE_JOB.refreshMostTrendyAuthorView,
      this.handleRefreshView(MATERIALIZED_VIEW.most_trendy_author_materialized)
    )
    this.q.process(
      QUEUE_JOB.refreshUserActivityView,
      this.handleRefreshView('user_activity_materialized')
    )
    this.q.process(
      QUEUE_JOB.refreshRecentlyReadTagsView,
      this.handleRefreshView('recently_read_tags_materialized')
    )
    this.q.process(
      QUEUE_JOB.refreshArticleReadTimeView,
      this.handleRefreshView('article_read_time_materialized')
    )
    this.q.process(
      QUEUE_JOB.refreshRecommendedArticlesFromReadTagsView,
      this.handleRefreshView('recommended_articles_from_read_tags_materialized')
    )
  }

  private handleRefreshView =
    (view: MaterializedView): Queue.ProcessCallbackFunction<unknown> =>
    async (job, done) => {
      try {
        logger.info(`[schedule job] refreshing view ${view}`)
        await refreshView(view)
        job.progress(100)
        done(null)
      } catch (e) {
        logger.error(
          `[schedule job] error in refreshing view ${view}: ${JSON.stringify(
            e
          )}`
        )
        done(e)
      }
    }
}

export const refreshViewsQueue = new RefreshViewsQueue()
