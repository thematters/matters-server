import elasticsearch from 'elasticsearch'
import { environment } from 'common/environment'

const indices = ['article', 'user']

export const es = new elasticsearch.Client({
  hosts: [environment.elasticSearchEndpoint]
})

const esInit = async () => {
  await es.ping(
    {
      requestTimeout: 30000
    },
    function(error) {
      if (error) {
        console.error('ElasticSearch cluster is down!')
      } else {
        console.log('ElasticSearch connected')
      }
    }
  )

  for (const index of indices) {
    const exists = await es.indices.exists({ index })
    if (!exists) {
      console.log(`Creating index ${index}`)
      await es.indices.create({ index })
      console.log(`Done`)
    }
  }
}

// esInit()
