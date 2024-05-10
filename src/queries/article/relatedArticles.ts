import type { GQLArticleResolvers, Article } from 'definitions'

import _ from 'lodash'

import { ARTICLE_STATE, LATEST_WORKS_NUM } from 'common/enums'
import { connectionFromArray, fromConnectionArgs } from 'common/utils'

const resolver: GQLArticleResolvers['relatedArticles'] = async (
  { id: articleId, authorId },
  { input },
  { dataSources: { articleService, tagService, atomService } }
) => {
  // return 3 recommendations by default
  const { take, skip } = fromConnectionArgs(input, { defaultTake: 3 })

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

    const articleIds = await tagService.findArticleIds({
      id: tagId,
      take,
      skip,
    })

    // get articles and append
    const articlesFromTag = await atomService.articleIdLoader.loadMany(
      articleIds
    )

    articles = addRec(
      articles,
      articlesFromTag.filter(({ state }) => state === ARTICLE_STATE.active)
    )
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
