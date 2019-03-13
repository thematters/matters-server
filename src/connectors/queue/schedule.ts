// external
import Queue from 'bull'
// internal
import {
  QUEUE_JOB,
  QUEUE_PRIORITY,
  QUEUE_NAME,
  PUBLISH_STATE,
  MATERIALIZED_VIEW
} from 'common/enums'
import logger from 'common/logger'
import { MaterializedView } from 'definitions'
import { DraftService, UserService, ArticleService } from 'connectors'
import { refreshView } from '../db'
// local
import { createQueue } from './utils'
import publicationQueue from './publication'

class ScheduleQueue {
  q: InstanceType<typeof Queue>
  draftService: InstanceType<typeof DraftService>
  userService: InstanceType<typeof UserService>
  articleService: InstanceType<typeof ArticleService>

  private queueName = QUEUE_NAME.schedule

  constructor() {
    this.draftService = new DraftService()
    this.userService = new UserService()
    this.articleService = new ArticleService()
  }

  start = () => {
    this.q = createQueue(this.queueName)
    this.addConsumers()
    this.addRepeatJobs()
  }

  /**
   * Cusumers
   */
  private addConsumers = () => {
    // publish pending drafs
    this.q.process(QUEUE_JOB.publishPendingDrafts, async (job, done) => {
      try {
        const drafts = await this.draftService.findByPublishState(
          PUBLISH_STATE.pending
        )
        const pendingDraftIds: string[] = []

        drafts.forEach((draft: any, index: number) => {
          publicationQueue.publishArticle({ draftId: draft.id, delay: 0 })
          pendingDraftIds.push(draft.id)
          job.progress(((index + 1) / drafts.length) * 100)
        })

        job.progress(100)
        done(null, pendingDraftIds)
      } catch (e) {
        done(e)
      }
    })

    // initialize search
    // this.q.process(QUEUE_JOB.initializeSearch, async (job, done) => {
    //   logger.info(`[schedule job] initializing search`)
    //   try {
    //     await this.articleService.es.clear()
    //     const articleRes = await this.articleService.initSearch()
    //     job.progress(50)
    //     const userRes = await this.userService.initSearch()
    //     job.progress(100)
    //     done(null, { articleRes, userRes })
    //   } catch (e) {
    //     logger.error(
    //       `[schedule job] error in initializing search: ${JSON.stringify(e)}`
    //     )
    //     done(e)
    //   }
    // })

    // refresh view
    this.q.process(
      QUEUE_JOB.refreshView,
      async (
        job: { data: { view: MaterializedView }; [key: string]: any },
        done
      ) => {
        const { view } = job.data
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
    )
  }

  /**
   * Producers
   */
  addRepeatJobs = () => {
    // publish pending draft every 20 minutes
    this.q.add(QUEUE_JOB.publishPendingDrafts, null, {
      priority: QUEUE_PRIORITY.HIGH,
      repeat: {
        every: 1000 * 60 * 20 // every 20 mins
      }
      // removeOnComplete: true
    })

    // initialize search every day at 4am
    // moved to db pipeline
    // this.q.add(QUEUE_JOB.initializeSearch, null, {
    //   priority: QUEUE_PRIORITY.CRITICAL,
    //   repeat: { cron: '0 4 * * *', tz: 'Asia/Hong_Kong' }
    // })

    // refresh articleActivityMaterialized every 1.1 hour, for hottest recommendation
    this.q.add(
      QUEUE_JOB.refreshView,
      { view: MATERIALIZED_VIEW.articleActivityMaterialized },
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: {
          every: 1000 * 60 * 16 // every 15 + 1 minutes
        }
      }
    )

    // refresh articleCountMaterialized every 2.1 hours, for topics recommendation
    this.q.add(
      QUEUE_JOB.refreshView,
      { view: MATERIALIZED_VIEW.articleCountMaterialized },
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: {
          every: 1000 * 60 * 60 * 1.1 // every 1 + 0.1 hour
        }
      }
    )

    // refresh tagCountMaterialized every 3.1 hours
    this.q.add(
      QUEUE_JOB.refreshView,
      { view: MATERIALIZED_VIEW.tagCountMaterialized },
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: {
          every: 1000 * 60 * 60 * 3.1 // every 3 + 0.1 hour
        }
      }
    )

    // refresh userReaderMaterialized every day at 3am
    this.q.add(
      QUEUE_JOB.refreshView,
      { view: MATERIALIZED_VIEW.userReaderMaterialized },
      {
        priority: QUEUE_PRIORITY.MEDIUM,
        repeat: { cron: '0 3 * * *', tz: 'Asia/Hong_Kong' }
      }
    )
  }
}

export default new ScheduleQueue()
