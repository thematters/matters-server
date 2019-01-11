import elasticsearch from 'elasticsearch'
import _ from 'lodash'

import { environment } from 'common/environment'
import logger from 'common/logger'

const { esHost: host, esPort: port } = environment

class ElasticSearch {
  client: elasticsearch.Client

  indices = ['article', 'user']

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

  clear = async () => {
    try {
      await this.client.indices.delete({
        index: '_all'
      })

      await this.init()
      logger.info('All search indices are cleared')
    } catch (err) {
      throw err
    }
  }

  indexItems = async ({
    index,
    items
  }: {
    index: string
    items: { [key: string]: any; id: string }[]
  }) => {
    const exists = await this.client.indices.exists({ index })
    if (!exists) {
      await this.client.indices.create({ index })
    }

    try {
      const body = _.flattenDepth(
        items.map(item => [
          { index: { _index: index, _type: index, _id: item.id } },
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
