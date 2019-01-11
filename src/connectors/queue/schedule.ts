// external
import Queue from 'bull'
// internal
import {
  QUEUE_JOB,
  QUEUE_PRIORITY,
  QUEUE_NAME,
  PUBLISH_STATE
} from 'common/enums'
import { DraftService } from 'connectors/draftService'
// local
import { createQueue } from './utils'

class ScheduleQueue {
  q: InstanceType<typeof Queue>
  draftService: InstanceType<typeof DraftService>

  private queueName = QUEUE_NAME.schedule

  constructor() {
    this.draftService = new DraftService()
    this.q = createQueue(this.queueName)
    this.addConsumers()
    this.addRepeatJobs()
  }

  /**
   * Cusumers
   */
  private addConsumers = () => {
    const { publicationQueue } = require('./publication')

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
  }

  /**
   * Producers
   */
  addRepeatJobs = () => {
    this.q.add(QUEUE_JOB.publishPendingDrafts, null, {
      priority: QUEUE_PRIORITY.HIGH,
      repeat: {
        every: 1000 * 60 * 20 // every 20 mins
      }
      // removeOnComplete: true
    })
  }
}

export const scheduleQueue = new ScheduleQueue()
