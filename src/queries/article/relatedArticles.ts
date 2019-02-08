import _ from 'lodash'
import { ArticleToRelatedArticlesResolver } from 'definitions'
import bodybuilder from 'bodybuilder'
import { connectionFromPromisedArray } from 'common/utils'

const resolver: ArticleToRelatedArticlesResolver = async (
  { authorId, id },
  { input },
  { viewer, dataSources: { articleService, tagService } }
) => {
  // return 10 recommendations by default
  const recommendationSize = input.first || 10

  // helper function to prevent duplicates and origin article
  const addRec = (rec: string[], extra: string[]) =>
    _.without(_.uniq(rec.concat(extra)), id)

  // get initial recommendation
  const relatedArticles = await articleService.related({
    id,
    size: recommendationSize
  })

  // pull out ids
  let ids: string[] = relatedArticles.map(({ id }) => id)

  // fall back to using tag
  if (ids.length < recommendationSize) {
    const tagIds = await articleService.findTagIds({ id })

    for (const tagId of tagIds) {
      if (ids.length >= recommendationSize) {
        break
      }

      let articleIds = await tagService.findArticleIds({
        id: tagId,
        limit: recommendationSize - ids.length
      })
      ids = addRec(ids, articleIds)
    }
  }

  // fall back to using author
  if (ids.length >= recommendationSize) {
    let articles = await articleService.findByAuthor(authorId)
    ids = addRec(ids, articles.map(({ id }: { id: string }) => id))
  }

  return connectionFromPromisedArray(
    articleService.dataloader.loadMany(ids),
    input
  )
}

export default resolver
