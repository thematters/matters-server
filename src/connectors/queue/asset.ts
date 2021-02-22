import Queue from 'bull'

import {
  ASSET_TYPE,
  MINUTE,
  QUEUE_CONCURRENCY,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
} from 'common/enums'
import { isTest } from 'common/environment'
import logger from 'common/logger'

import { BaseQueue } from './baseQueue'

interface AssetParams {
  ids: string[]
}

class AssetQueue extends BaseQueue {
  constructor() {
    super(QUEUE_NAME.asset)
    this.addConsumers()
  }

  /**
   * Producers
   */
  remove = ({ ids }: { ids: string[] }) => {
    return this.q.add(
      QUEUE_JOB.deleteAsset,
      { ids },
      {
        priority: QUEUE_PRIORITY.NORMAL,
        removeOnComplete: true,
      }
    )
  }

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

      const assets = await this.atomService.findMany({
        table: 'asset',
        whereIn: ['id', ids],
      })

      // delete db records
      await this.atomService.knex.transaction(async (trx) => {
        await trx('asset_map').whereIn('asset_id', ids).del()
        await trx('asset').whereIn('id', ids).del()
      })

      // delete s3 object
      await Promise.all(
        assets.map((asset) => this.atomService.aws.baseDeleteFile(asset.path))
      )

      job.progress(100)
      done(null, job.data)
    } catch (error) {
      logger.error(error)
      done(error)
    }
  }
}

export const assetQueue = new AssetQueue()
