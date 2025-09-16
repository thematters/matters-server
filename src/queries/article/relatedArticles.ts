import type { GQLArticleResolvers, Article } from '#definitions/index.js'

import { ARTICLE_STATE, LATEST_WORKS_NUM } from '#common/enums/index.js'
import { connectionFromArray, fromConnectionArgs } from '#common/utils/index.js'
import _ from 'lodash'

const resolver: GQLArticleResolvers['relatedArticles'] = async (
  { id: articleId, authorId },
  { input },
  { dataSources: { articleService, tagService, systemService } }
) => {
  // return 3 recommendations by default
  const { take, skip } = fromConnectionArgs(input, { defaultTake: 3 })
  const spamThreshold = (await systemService.getSpamThreshold()) ?? undefined

  // buffer for archived article and random draw
  const buffer = 7

  // helper function to prevent duplicates and exclude both origin article and articles return by `latestWorks` API
  const latestArticles = await articleService.findByAuthor(authorId, {
    take: LATEST_WORKS_NUM,
    orderBy: 'newest',
    state: ARTICLE_STATE.active,
  })
  const unwantedIds = [articleId, ...latestArticles.map(({ id }) => id)]
  const addRec = (rec: Article[], extra: Article[]) =>
    _.uniqBy(rec.concat(extra), 'id').filter(
      (_rec) => !unwantedIds.includes(_rec.id)
    )

  let articles: Article[] = []

  // first select from tags
  const tagIds = await articleService.findTagIds({ id: articleId })

  for (const tagId of tagIds) {
    if (articles.length >= take + buffer) {
      break
    }

    const articlesFromTag = await tagService
      .findArticles({
        id: tagId,
        excludeRestricted: true,
        spamThreshold,
      })
      .offset(skip)
      .limit(take)

    articles = addRec(articles, articlesFromTag)
  }

  // fall back to author
  if (articles.length < take + buffer) {
    const articlesFromAuthor = await articleService.findByAuthor(authorId, {
      skip: 3,
      state: ARTICLE_STATE.active,
    })
    articles = addRec(articles, articlesFromAuthor)
  }

  // random pick for last few elements
  const randomPick = 1
  let pick = articles.slice(0, take - randomPick)
  pick = pick.concat(
    _.sampleSize(articles.slice(take - randomPick), randomPick)
  )

  return connectionFromArray(pick, input)
}

export default resolver
