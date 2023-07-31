import type { GQLArticleResolvers } from 'definitions'

import _ from 'lodash'

import { getLogger } from 'common/logger'
import { connectionFromArray, fromConnectionArgs } from 'common/utils'

const logger = getLogger('related-articles')

const resolver: GQLArticleResolvers['relatedArticles'] = async (
  { articleId, authorId },
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

  // const ids: string[] = []
  let articles: any[] = []

  let sameIdx = -1

  // first select from tags
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

    // get articles and append
    const articlesFromTag = await articleService.dataloader.loadMany(articleIds)

    articles = addRec(articles, articlesFromTag)
  }

  if (
    // tslint:disable-next-line
    (sameIdx = articles?.findIndex((item: any) => item.id === articleId)) >= 0
  ) {
    logger.info(
      `found same article at {${sameIdx}} at tagService.findArticleIds step and remove it: %j`,
      { sameIdx, articleId }
    )
    articles.splice(sameIdx, 1)
    sameIdx = -1
  }

  // fall back to author
  if (articles.length < take + buffer) {
    const articlesFromAuthor = await articleService.findByAuthor(authorId)
    // logger.info(`[recommendation] article ${articleId}, title ${title}, author result ${articlesFromAuthor.map(({ id: aid }: { id: string }) => aid)} `)
    articles = addRec(articles, articlesFromAuthor)
  }

  if (
    // tslint:disable-next-line
    (sameIdx = articles?.findIndex((item: any) => item.id === articleId)) >= 0
  ) {
    logger.info(
      `found same article at {${sameIdx}} at articleService.findByAuthor step and remove it: %j`,
      { sameIdx, articleId }
    )
    articles.splice(sameIdx, 1)
    sameIdx = -1
  }

  // random pick for last few elements
  const randomPick = 1
  let pick = articles.slice(0, take - randomPick)
  pick = pick.concat(
    _.sampleSize(articles.slice(take - randomPick), randomPick)
  )

  if (
    // tslint:disable-next-line
    (sameIdx = pick?.findIndex((item: any) => item.id === articleId)) >= 0
  ) {
    logger.info(
      `found same article at {${sameIdx}} at randomPick step and remove it: %j`,
      { sameIdx, articleId }
    )
    pick.splice(sameIdx, 1)
    sameIdx = -1
  }

  const nodes = await draftService.dataloader.loadMany(
    pick.map((item) => item.draftId)
  )

  if (
    // tslint:disable-next-line
    (sameIdx = nodes?.findIndex((item: any) => item.articleId === articleId)) >=
    0
  ) {
    logger.info(
      `found same article at {${sameIdx}} at last step and remove it: %j`,
      { sameIdx, articleId }
    )
    nodes.splice(sameIdx, 1)
  }

  return connectionFromArray(nodes, input)
}

export default resolver
