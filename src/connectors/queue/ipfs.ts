import Queue from 'bull'
import _ from 'lodash'

import {
  MINUTE,
  PIN_STATE,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
  SLACK_MESSAGE_STATE,
} from 'common/enums'
import logger from 'common/logger'
import { timeout } from 'common/utils'
import { ipfs } from 'connectors'
import SlackService from 'connectors/slack'

import { BaseQueue } from './baseQueue'

class IPFSQueue extends BaseQueue {
  slackService: InstanceType<typeof SlackService>
  ipfs: typeof ipfs

  constructor() {
    super(QUEUE_NAME.circle)

    this.ipfs = ipfs
    this.slackService = new SlackService()

    this.addConsumers()
  }

  /**
   * Producers
   */
  addRepeatJobs = async () => {
    // verify pinning hashes every 30 minutes
    this.q.add(
      QUEUE_JOB.verifyIPFSPinHashes,
      {},
      {
        priority: QUEUE_PRIORITY.LOW,
        repeat: { every: MINUTE * 30 },
      }
    )
  }

  /**
   * Consumers
   */
  private addConsumers = () => {
    this.q.process(QUEUE_JOB.verifyIPFSPinHashes, this.verifyIPFSPinHashes)
  }

  private verifyIPFSPinHashes: Queue.ProcessCallbackFunction<unknown> = async (
    job,
    done
  ) => {
    try {
      logger.info('[schedule job] verify IPFS pinning hashes')

      // obtain first 500 pinning drafts
      const pinningDrafts = await this.atomService.findMany({
        table: 'draft',
        where: { pinState: PIN_STATE.pinning },
        take: 500,
        orderBy: [{ column: 'id', order: 'desc' }],
      })

      job.progress(30)

      const succeedIds: string[] = []
      const failedIds: string[] = []
      const chunks = _.chunk(pinningDrafts, 10)

      const verifyHash = async (draftId: string, hash: string) => {
        try {
          await timeout(3000, async () => {
            // ping hash
            await this.ipfs.client.get(hash)

            // mark as pin state as `pinned`
            await this.markDraftPinStateAs({
              draftId,
              pinState: PIN_STATE.pinned,
            })

            succeedIds.push(draftId)
            logger.info(
              `[schedule job] hash (${hash}) of draft (${draftId}) was pinned.`
            )
          })
        } catch (error) {
          // mark as pin state as `failed`
          await this.markDraftPinStateAs({
            draftId,
            pinState: PIN_STATE.failed,
          })

          failedIds.push(draftId)
          logger.error(error)
        }
      }

      for (const drafts of chunks) {
        await Promise.all(
          drafts.map((draft) => verifyHash(draft.id, draft.dataHash))
        )
      }

      job.progress(100)
      if (pinningDrafts.length >= 1) {
        this.slackService.sendQueueMessage({
          data: { succeedIds, failedIds },
          title: `${QUEUE_NAME.ipfs}:verifyIPFSPinHashes`,
          message: `Completed handling ${pinningDrafts.length} hashes.`,
          state: SLACK_MESSAGE_STATE.successful,
        })
      }
      done(null, { succeedIds, failedIds })
    } catch (error) {
      logger.error(error)
      this.slackService.sendQueueMessage({
        title: `${QUEUE_NAME.ipfs}:verifyIPFSPinHashes`,
        message: `Failed to process cron job`,
        state: SLACK_MESSAGE_STATE.failed,
      })
      done(error)
    }
  }

  private markDraftPinStateAs = async ({
    draftId,
    pinState,
  }: {
    draftId: string
    pinState: PIN_STATE
  }) => {
    await this.atomService.update({
      table: 'draft',
      where: { id: draftId },
      data: { pinState },
    })
  }
}

export const ipfsQueue = new IPFSQueue()
