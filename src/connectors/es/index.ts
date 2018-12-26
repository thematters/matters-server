import elasticsearch from 'elasticsearch'

import { environment } from 'common/environment'
import { knex } from '../db'

const { esHost: host, esPort: port } = environment

class ElasticSearch {
  client: elasticsearch.Client

  indices = ['article', 'user']

  constructor() {
    this.client = new elasticsearch.Client({
      host: { host, port }
    })
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
      console.log(`Creating index ${index}`)
      await this.client.indices.create({ index })
      console.log(`Done`)
    }

    try {
      console.log('start adding', { items })
      const body = items
        .map(item => {
          return [
            { index: { _index: index, _type: index, _id: item.id } },
            item
          ]
        })
        .flat()

      console.log(JSON.stringify(body))

      const res = await this.client.bulk({
        body
      })
      console.log({ res })
      return res
    } catch (err) {
      throw err
    }
  }
}

export const es = new ElasticSearch()
