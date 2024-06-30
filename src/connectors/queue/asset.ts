import type { Connections } from 'definitions'

import Queue from 'bull'

import { QUEUE_JOB, QUEUE_NAME, QUEUE_PRIORITY } from 'common/enums'
import { getLogger } from 'common/logger'
import { AtomService, aws, cfsvc } from 'connectors'

import { getOrCreateQueue } from './utils'

const logger = getLogger('queue-asset')

interface AssetParams {
  ids: string[]
}

export class AssetQueue {
  private connections: Connections
  private q: InstanceType<typeof Queue>
  public constructor(connections: Connections) {
    this.connections = connections
    const [q, created] = getOrCreateQueue(QUEUE_NAME.asset)
    this.q = q
    if (created) {
      this.addConsumers()
    }
  }

  /**
   * Producers
   */
  public remove = ({ ids }: { ids: string[] }) =>
    this.q.add(
      QUEUE_JOB.deleteAsset,
      { ids },
      {
        priority: QUEUE_PRIORITY.NORMAL,
        removeOnComplete: true,
      }
    )

  /**
   * Consumer
   */
  private addConsumers = () => {
    this.q.process(QUEUE_JOB.deleteAsset, this.deleteAsset)
  }

  private deleteAsset: Queue.ProcessCallbackFunction<unknown> = async (
    job,
    done
  ) => {
    try {
      const { ids } = job.data as AssetParams

      if (!ids || ids.length === 0) {
        throw new Error('asset job has no required data')
      }

      const atomService = new AtomService(this.connections)
      const assets = await atomService.findMany({
        table: 'asset',
        whereIn: ['id', ids],
      })

      // delete db records
      await this.connections.knex.transaction(async (trx) => {
        await trx('asset_map').whereIn('asset_id', ids).del()
        await trx('asset').whereIn('id', ids).del()
      })

      // delete files in S3/Cloudflare Images
      await Promise.all(
        assets
          .map((asset) => [
            aws.baseDeleteFile(asset.path),
            cfsvc.baseDeleteFile(asset.path),
          ])
          .flat()
      )

      job.progress(100)
      done(null, job.data)
    } catch (err: unknown) {
      logger.error(err)
      if (err instanceof Error) {
        done(err)
      }
    }
  }
}
