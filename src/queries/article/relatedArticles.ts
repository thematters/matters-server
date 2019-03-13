import _ from 'lodash'

import { ArticleToRelatedArticlesResolver } from 'definitions'
import { connectionFromPromisedArray } from 'common/utils'
import logger from 'common/logger'
import { ARTICLE_STATE } from 'common/enums'

const resolver: ArticleToRelatedArticlesResolver = async (
  { authorId, id },
  { input },
  { viewer, dataSources: { articleService, tagService } }
) => {
  // return 5 recommendations by default
  const recommendationSize = input.first || 5

  // helper function to prevent duplicates and origin article
  const addRec = (rec: string[], extra: string[]) =>
    _.without(_.uniq(rec.concat(extra)), id)

  let ids: string[] = []
  // get initial recommendation
  try {
    // TODO: filter archived article
    const relatedArticles = await articleService.related({
      id,
      size: recommendationSize
    })

    // pull out ids
    ids = relatedArticles.map(({ id }) => id)
  } catch (err) {
    logger.error(`error in recommendation via ES: ${JSON.stringify(err)}`)
  }

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
    let articles = await articleService.findByAuthor(authorId, {
      state: ARTICLE_STATE.active
    })
    ids = addRec(ids, articles.map(({ id }: { id: string }) => id))
  }

  return connectionFromPromisedArray(
    articleService.dataloader.loadMany(ids),
    input
  )
}

export default resolver
