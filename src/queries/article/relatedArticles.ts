import _ from 'lodash'

import { ARTICLE_STATE } from 'common/enums'
import logger from 'common/logger'
import { connectionFromArray } from 'common/utils'
import { ArticleToRelatedArticlesResolver } from 'definitions'

const resolver: ArticleToRelatedArticlesResolver = async (
  { authorId, id, title },
  { input },
  { dataSources: { articleService, tagService } }
) => {
  // buffer for archived article and random draw
  const buffer = 7

  // return 3 recommendations by default
  const recommendationSize = input.first || 3

  // helper function to prevent duplicates and origin article
  const addRec = (rec: any[], extra: any[]) =>
    _.uniqBy(rec.concat(extra), 'id').filter(_rec => _rec.id !== id)

  const ids: string[] = []
  let articles: any[] = []
  // get initial recommendation
  try {
    const relatedArticles = await articleService.related({
      id,
      size: recommendationSize + buffer
    })

    logger.info(
      `[recommendation] article ${id}, title ${title}, ES result ${articles.map(
        ({ id: aid }) => aid
      )} `
    )

    // get articles
    articles = await articleService.dataloader
      .loadMany(relatedArticles.map(({ id: aid }: { id: any }) => aid))
      .then(allArticles =>
        allArticles.filter(({ state }) => state === ARTICLE_STATE.active)
      )
  } catch (err) {
    logger.error(`error in recommendation via ES: ${JSON.stringify(err)}`)
  }

  // fall back to tags
  if (articles.length < recommendationSize + buffer) {
    const tagIds = await articleService.findTagIds({ id })

    for (const tagId of tagIds) {
      if (articles.length >= recommendationSize + buffer) {
        break
      }

      const articleIds = await tagService.findArticleIds({
        id: tagId,
        limit: recommendationSize - ids.length
      })

      logger.info(
        `[recommendation] article ${id}, title ${title}, tag result ${articleIds} `
      )

      // get articles and append
      const articlesFromTag = await articleService.dataloader.loadMany(
        articleIds
      )

      articles = addRec(articles, articlesFromTag)
    }
  }

  // fall back to author
  if (articles.length < recommendationSize + buffer) {
    const articlesFromAuthor = await articleService.findByAuthor(authorId, {
      state: ARTICLE_STATE.active
    })
    logger.info(
      `[recommendation] article ${id}, title ${title}, author result ${articlesFromAuthor.map(
        ({ id: aid }: { id: string }) => aid
      )} `
    )
    articles = addRec(articles, articlesFromAuthor)
  }

  // random pick for last few elements
  const randomPick = 1
  let pick = articles.slice(0, recommendationSize - randomPick)
  pick = pick.concat(
    _.sampleSize(articles.slice(recommendationSize - randomPick), randomPick)
  )

  return connectionFromArray(pick, input)
}

export default resolver
