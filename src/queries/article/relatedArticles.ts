import _ from 'lodash'
import { ArticleToRelatedArticlesResolver } from 'definitions'
import bodybuilder from 'bodybuilder'
import { connectionFromPromisedArray } from 'common/utils'

const resolver: ArticleToRelatedArticlesResolver = async (
  { id, authorId },
  { input },
  { viewer, dataSources: { articleService, tagService } }
) => {
  const recommendationSize = 10 // return 10 recommendations by default

  const scoreResult = await articleService.es.client.get({
    index: 'article',
    type: 'article',
    id: '1'
  })
  let ids: string[] = []
  const factorString = _.get(scoreResult, '_source.factor')

  if (factorString) {
    const factor = factorString
      .split(' ')
      .map((s: string) => parseFloat(s.split('|')[1]))

    const q = '*'
    const body = bodybuilder()
      .query('function_score', {
        query: {
          query_string: {
            query: q
          }
        },
        script_score: {
          script: {
            inline: 'payload_vector_score',
            lang: 'native',
            params: {
              field: 'factor',
              vector: factor,
              cosine: true
            }
          }
        },
        boost_mode: 'replace'
      })
      .size(input.first || recommendationSize)
      .build()

    console.log(body)

    const relatedResult = await articleService.es.client.search({
      index: 'article',
      type: 'article',
      body
    })

    ids = relatedResult['hits']['hits'].map(({ _id }) => _id)
  }

  // const addRec = (rec: string[], extra: string[]) =>
  //   _.without(_.uniq(rec.concat(extra)), id)

  // const tagIds = await articleService.findTagIds({ id })

  // for (const tagId of tagIds) {
  //   if (recommendations.length >= recommendationSize) {
  //     break
  //   }

  //   let articleIds = await tagService.findArticleIds({
  //     id: tagId,
  //     limit: recommendationSize - recommendations.length
  //   })
  //   recommendations = addRec(recommendations, articleIds)
  // }

  // if (recommendations.length >= recommendationSize) {
  //   let articles = await articleService.findByAuthor(authorId)
  //   recommendations = addRec(
  //     recommendations,
  //     articles.map(({ id }: { id: string }) => id)
  //   )
  // }

  console.log({ ids })

  return connectionFromPromisedArray(
    articleService.dataloader.loadMany(ids),
    input
  )
  // TODO: use vector score from ElasticSearch
  // let recommendations: string[] = []

  // return connectionFromPromisedArray(
  //   articleService.dataloader.loadMany(recommendations),
  //   input
  // )
}

export default resolver
