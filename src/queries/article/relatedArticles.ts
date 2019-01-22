import { uniq, without } from 'lodash'
import { ArticleToRelatedArticlesResolver } from 'definitions'
import { connectionFromPromisedArray } from 'common/utils'

const resolver: ArticleToRelatedArticlesResolver = async (
  { id, authorId },
  { input },
  { viewer, dataSources: { articleService, tagService } }
) => {
  const recommendationSize = 10 // return 10 recommendations for now

  // TODO: use vector score from ElasticSearch
  let recommendations: string[] = []

  const addRec = (rec: string[], extra: string[]) =>
    without(uniq(rec.concat(extra)), id)

  const tagIds = await articleService.findTagIds({ id })

  for (const tagId of tagIds) {
    if (recommendations.length >= recommendationSize) {
      break
    }

    let articleIds = await tagService.findArticleIds({
      id: tagId,
      limit: recommendationSize - recommendations.length
    })
    recommendations = addRec(recommendations, articleIds)
  }

  if (recommendations.length >= recommendationSize) {
    let articles = await articleService.findByAuthor(authorId)
    recommendations = addRec(
      recommendations,
      articles.map(({ id }: { id: string }) => id)
    )
  }

  console.log(recommendations)

  return connectionFromPromisedArray(
    articleService.dataloader.loadMany(recommendations),
    input
  )
}

export default resolver
