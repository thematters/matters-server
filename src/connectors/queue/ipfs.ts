import type { Connections } from 'definitions'
import type { Redis } from 'ioredis'

import Queue from 'bull'
import _ from 'lodash'

import {
  // HOUR,
  MINUTE,
  PIN_STATE,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
  SLACK_MESSAGE_STATE,
} from 'common/enums'
import { getLogger } from 'common/logger'
import { timeout } from 'common/utils'
import { ipfsServers, AtomService } from 'connectors'
import SlackService from 'connectors/slack'

import { BaseQueue } from './baseQueue'

const logger = getLogger('queue-ipfs')

export class IPFSQueue extends BaseQueue {
  slackService: InstanceType<typeof SlackService>
  ipfs: typeof ipfsServers

  constructor(queueRedis: Redis, connections: Connections) {
    super(QUEUE_NAME.ipfs, queueRedis, connections)

    this.ipfs = ipfsServers
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
    const atomService = new AtomService(this.connections)

    try {
      logger.info('[schedule job] verify IPFS pinning hashes')

      // obtain first 500 pinning drafts
      const pinningDrafts = await atomService.findMany({
        table: 'draft',
        where: { pinState: PIN_STATE.pinning },
        take: 500,
        orderBy: [{ column: 'id', order: 'desc' }],
      })

      job.progress(30)

      const succeedIds: string[] = []
      const failedIds: string[] = []
      const chunks = _.chunk(pinningDrafts, 10)

      const verifyHash = async (draft: any) => {
        // ping hash
        await this.ipfs.client.get(draft.dataHash)

        // mark as pin state as `pinned`
        await this.markDraftPinStateAs(
          {
            draftId: draft.id,
            pinState: PIN_STATE.pinned,
          },
          atomService
        )

        succeedIds.push(draft.id)
        logger.info(
          `[schedule job] draft ${draft.id} (${draft.dataHash}) was pinned.`
        )
      }

      for (const drafts of chunks) {
        await Promise.all(
          drafts.map(async (draft) => {
            try {
              await timeout(5000, verifyHash(draft))
            } catch (error) {
              // mark as pin state as `failed`
              await this.markDraftPinStateAs(
                {
                  draftId: draft.id,
                  pinState: PIN_STATE.failed,
                },
                atomService
              )

              failedIds.push(draft.id)
              logger.error(error)
            }
          })
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
    } catch (err: any) {
      logger.error(err)
      this.slackService.sendQueueMessage({
        title: `${QUEUE_NAME.ipfs}:verifyIPFSPinHashes`,
        message: `Failed to process cron job`,
        state: SLACK_MESSAGE_STATE.failed,
      })
      done(err)
    }
  }

  private markDraftPinStateAs = async (
    {
      draftId,
      pinState,
    }: {
      draftId: string
      pinState: PIN_STATE
    },
    atomService: AtomService
  ) => {
    await atomService.update({
      table: 'draft',
      where: { id: draftId },
      data: { pinState },
    })
  }
}
