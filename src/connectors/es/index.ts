import elasticsearch from 'elasticsearch'
import _ from 'lodash'

import { environment } from 'common/environment'
import logger from 'common/logger'

const { esHost: host, esPort: port, env } = environment

type Item = { [key: string]: any; id: string }

class ElasticSearch {
  client: elasticsearch.Client

  indices = ['article', 'user', 'analysis']

  constructor() {
    this.client = new elasticsearch.Client({
      host: { host, port }
    })

    this.init()
  }

  init = async () => {
    for (const index of this.indices) {
      const exists = await this.client.indices.exists({ index })
      if (!exists) {
        logger.info(`Creating index ${index}`)
        await this.client.indices.create({ index })
        logger.info(`Done`)
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
    type
  }: {
    index: string
    type?: string
    items: Item[]
  }) => {
    // break items into chunks
    const size = 25
    let chunks: Item[][] = []
    while (items.length) {
      chunks.push(items.splice(0, size))
    }

    // index items by chunks
    const indexItemsByChunk = async (chunks: Item[][]) => {
      for (let i = 0; i < chunks.length; i++) {
        await this.indexItems({
          index,
          type: type || index,
          items: chunks[i]
        })
        logger.info(`Indexed ${chunks[i].length} items into ${index}.`)
      }
    }
    return indexItemsByChunk(chunks)
  }

  indexItems = async ({
    index,
    items,
    type
  }: {
    index: string
    type?: string
    items: Item[]
  }) => {
    const _type = type || index
    const exists = await this.client.indices.exists({ index })
    if (!exists) {
      await this.client.indices.create({ index })
    }

    try {
      const body = _.flattenDepth(
        items.map(item => [
          { index: { _index: index, _type, _id: item.id } },
          item
        ])
      )

      const res = await this.client.bulk({
        body
      })
      return res
    } catch (err) {
      throw err
    }
  }
}

export const es = new ElasticSearch()
