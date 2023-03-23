import elasticsearch from '@elastic/elasticsearch'
import _ from 'lodash'

import { environment } from 'common/environment.js'
import logger from 'common/logger.js'

interface Item {
  [key: string]: any
  id: string
}

class ElasticSearch {
  client: elasticsearch.Client

  indices = ['article', 'user', 'tag']

  constructor() {
    this.client = new elasticsearch.Client({
      node: `http://${environment.esHost}:${environment.esPort}`,
    })

    this.init()
  }

  init = async () => {
    for (const index of this.indices) {
      const exists = await this.client.indices.exists({ index })
      if (!exists) {
        try {
          logger.info(`Creating index ${index}`)
          await this.client.indices.create({ index })
          logger.info(`Done`)
        } catch (e) {
          logger.error((e as Error).message)
        }
      }
    }
  }

  // clear = async () => {
  //   try {
  //     await this.client.indices.delete({
  //       index: '_all'
  //     })

  //     await this.init()
  //     logger.info('All search indices are cleared')
  //   } catch (err) {
  //     throw err
  //   }
  // }

  /**
   * break many items into smaller chunks, then bulk index each chunk
   */
  indexManyItems = async ({
    index,
    items,
    type,
  }: {
    index: string
    type?: string
    items: Item[]
  }) => {
    // break items into chunks
    const size = 25
    const chunks: Item[][] = []
    while (items.length) {
      chunks.push(items.splice(0, size))
    }

    // index items by chunks
    const indexItemsByChunk = async (chks: Item[][]) => {
      for (let i = 0; i < chks.length; i++) {
        await this.indexItems({
          index,
          items: chks[i],
        })
        logger.info(`Indexed ${chks[i].length} items into ${index}.`)
      }
    }

    return indexItemsByChunk(chunks)
  }

  indexItems = async ({ index, items }: { index: string; items: Item[] }) => {
    const exists = await this.client.indices.exists({ index })
    if (!exists) {
      await this.client.indices.create({ index })
    }

    try {
      const body = _.flattenDepth(
        items.map((item) => [{ index: { _index: index, _id: item.id } }, item])
      )

      const res = await this.client.bulk({
        body,
      })
      return res
    } catch (err) {
      throw err
    }
  }
}

export const es = new ElasticSearch()
