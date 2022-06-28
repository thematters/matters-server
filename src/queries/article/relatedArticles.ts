import _ from 'lodash'

import { ARTICLE_STATE } from 'common/enums'
import logger from 'common/logger'
import {
  connectionFromArray,
  fromConnectionArgs,
  loadManyFilterError,
} from 'common/utils'
import { ArticleToRelatedArticlesResolver } from 'definitions'

const resolver: ArticleToRelatedArticlesResolver = async (
  { articleId, authorId, title },
  { input },
  { dataSources: { articleService, draftService, tagService } }
) => {
  // return 3 recommendations by default
  const { take, skip } = fromConnectionArgs(input, { defaultTake: 3 })

  // buffer for archived article and random draw
  const buffer = 7

  // helper function to prevent duplicates and origin article
  const addRec = (rec: any[], extra: any[]) =>
    _.uniqBy(rec.concat(extra), 'id').filter((_rec) => _rec.id !== articleId)

  // articles in collection for this article as the entrance
  const entranceId = articleId
  const collection = (await articleService.findCollections({ entranceId })).map(
    ({ articleId: aid }: { articleId: any }) => aid
  )
  const ids: string[] = []
  let articles: any[] = []
  // get initial recommendation
  try {
    const relatedArticles = await articleService.related({
      id: articleId,
      size: take + buffer,
      notIn: collection,
    })

    // articles in collection shall be excluded from recommendation
    const relatedArticleIds = relatedArticles.map(
      ({ id: aid }: { id: any }) => aid
    )

    // logger.info(`[recommendation] article ${articleId}, title ${title}, ES result ${relatedArticleIds}`)

    // get articles
    articles = await articleService.dataloader
      .loadMany(relatedArticleIds)
      .then(loadManyFilterError)
      .then((allArticles) =>
        allArticles.filter(({ state }) => state === ARTICLE_STATE.active)
      )
  } catch (err) {
    logger.error(`error in recommendation via ES: ${JSON.stringify(err)}`)
  }

  // fall back to tags
  if (articles.length < take + buffer) {
    const tagIds = await articleService.findTagIds({ id: articleId })

    for (const tagId of tagIds) {
      if (articles.length >= take + buffer) {
        break
      }

      const articleIds = await tagService.findArticleIds({
        id: tagId,
        take: take - ids.length,
        skip,
      })

      // logger.info(`[recommendation] article ${articleId}, title ${title}, tag result ${articleIds} `)

      // get articles and append
      const articlesFromTag = await articleService.dataloader.loadMany(
        articleIds
      )

      articles = addRec(articles, articlesFromTag)
    }
  }

  // fall back to author
  if (articles.length < take + buffer) {
    const articlesFromAuthor = await articleService.findByAuthor(authorId, {
      state: ARTICLE_STATE.active,
    })
    // logger.info(`[recommendation] article ${articleId}, title ${title}, author result ${articlesFromAuthor.map(({ id: aid }: { id: string }) => aid)} `)
    articles = addRec(articles, articlesFromAuthor)
  }

  // random pick for last few elements
  const randomPick = 1
  let pick = articles.slice(0, take - randomPick)
  pick = pick.concat(
    _.sampleSize(articles.slice(take - randomPick), randomPick)
  )

  const nodes = await draftService.dataloader.loadMany(
    pick.map((item) => item.draftId)
  )

  return connectionFromArray(nodes, input)
}

export default resolver
