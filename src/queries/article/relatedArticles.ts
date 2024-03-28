import type { GQLArticleResolvers, Article } from 'definitions'

import _ from 'lodash'

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

  // helper function to prevent duplicates and origin article
  const addRec = (rec: Article[], extra: Article[]) =>
    _.uniqBy(rec.concat(extra), 'id').filter((_rec) => _rec.id !== articleId)

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

    articles = addRec(articles, articlesFromTag)
  }

  // fall back to author
  if (articles.length < take + buffer) {
    const articlesFromAuthor = await articleService.findByAuthor(authorId)
    articles = addRec(articles, articlesFromAuthor)
  }

  // random pick for last few elements
  const randomPick = 1
  let pick = articles.slice(0, take - randomPick)
  pick = pick.concat(
    _.sampleSize(articles.slice(take - randomPick), randomPick)
  )

  const nodes = await atomService.articleIdLoader.loadMany(
    pick.map((item) => item.id)
  )

  return connectionFromArray(nodes, input)
}

export default resolver
