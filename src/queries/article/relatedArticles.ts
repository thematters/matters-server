import _ from 'lodash'

import { ARTICLE_STATE } from 'common/enums/index.js'
import logger from 'common/logger.js'
import {
  connectionFromArray,
  fromConnectionArgs,
  loadManyFilterError,
} from 'common/utils/index.js'
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
  // const entranceId = articleId
  const collection = (
    await articleService.findCollections({ entranceId: articleId })
  ).map((item: any) => item.articleId)

  // const ids: string[] = []
  let articles: any[] = []

  let sameIdx = -1
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

    // tslint:disable-next-line
    if ((sameIdx = articles?.findIndex((item) => item.id === articleId)) >= 0) {
      console.log(
        new Date(),
        `found same article at {${sameIdx}} from articleService.related and remove it`,
        sameIdx
      )
      articles.splice(sameIdx, 1)
    }
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
        take, // : take - ids.length, // this ids.length is always 0??
        skip,
      })

      // logger.info(`[recommendation] article ${articleId}, title ${title}, tag result ${articleIds} `)

      // get articles and append
      const articlesFromTag = await articleService.dataloader.loadMany(
        articleIds
      )

      articles = addRec(articles, articlesFromTag)

      if (
        // tslint:disable-next-line
        (sameIdx = articles?.findIndex((item) => item.id === articleId)) >= 0
      ) {
        console.log(
          new Date(),
          `found same article at {${sameIdx}} from articleService.findTagIds and remove it`,
          { sameIdx, articleId, tagId }
        )
        articles.splice(sameIdx, 1)
      }
    }
  }

  // fall back to author
  if (articles.length < take + buffer) {
    const articlesFromAuthor = await articleService.findByAuthor(authorId)
    // logger.info(`[recommendation] article ${articleId}, title ${title}, author result ${articlesFromAuthor.map(({ id: aid }: { id: string }) => aid)} `)
    articles = addRec(articles, articlesFromAuthor)

    // tslint:disable-next-line
    if ((sameIdx = articles?.findIndex((item) => item.id === articleId)) >= 0) {
      console.log(
        new Date(),
        `found same article at {${sameIdx}} from articleService.findByAuthor and remove it`,
        { sameIdx, articleId }
      )
      articles.splice(sameIdx, 1)
    }
  }

  // random pick for last few elements
  const randomPick = 1
  let pick = articles.slice(0, take - randomPick)
  pick = pick.concat(
    _.sampleSize(articles.slice(take - randomPick), randomPick)
  )

  // tslint:disable-next-line
  if ((sameIdx = articles?.findIndex((item) => item.id === articleId)) >= 0) {
    console.log(
      new Date(),
      `found same article at {${sameIdx}} after randomPick and remove it`,
      { sameIdx, articleId }
    )
    articles.splice(sameIdx, 1)
  }

  const nodes = await draftService.dataloader.loadMany(
    pick.map((item) => item.draftId)
  )

  if (
    // tslint:disable-next-line
    (sameIdx = nodes?.findIndex((item: any) => item.articleId === articleId)) >=
    0
  ) {
    console.log(
      new Date(),
      `found same article at {${sameIdx}} at last step and remove it`,
      { sameIdx, articleId }
    )
    nodes.splice(sameIdx, 1)
  }

  return connectionFromArray(nodes, input)
}

export default resolver
