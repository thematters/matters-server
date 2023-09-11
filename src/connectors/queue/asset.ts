import type { Connections } from 'definitions'

import Queue from 'bull'

import { QUEUE_JOB, QUEUE_NAME, QUEUE_PRIORITY } from 'common/enums'
import { isTest } from 'common/environment'
import { getLogger } from 'common/logger'
import { AtomService } from 'connectors'

import { BaseQueue } from './baseQueue'

const logger = getLogger('queue-asset')

interface AssetParams {
  ids: string[]
}

export class AssetQueue extends BaseQueue {
  constructor(connections: Connections) {
    super(QUEUE_NAME.asset, connections)
    this.addConsumers()
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
    if (isTest) {
      return
    }

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
      await atomService.knex.transaction(async (trx) => {
        await trx('asset_map').whereIn('asset_id', ids).del()
        await trx('asset').whereIn('id', ids).del()
      })

      // delete s3 object
      await Promise.all(
        assets
          .map((asset) => [
            atomService.aws.baseDeleteFile(asset.path),
            atomService.cfsvc.baseDeleteFile(asset.path),
          ])
          .flat()
      )

      job.progress(100)
      done(null, job.data)
    } catch (err: any) {
      logger.error(err)
      done(err)
    }
  }
}
