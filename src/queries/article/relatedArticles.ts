import _ from 'lodash'

import { connectionFromArray, fromConnectionArgs } from 'common/utils'
import { ArticleToRelatedArticlesResolver } from 'definitions'

const resolver: ArticleToRelatedArticlesResolver = async (
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

  // fall back to author
  if (articles.length < take + buffer) {
    const articlesFromAuthor = await articleService.findByAuthor(authorId)
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
