import type { GQLArticleResolvers, Item } from 'definitions'

import { ARTICLE_STATE } from 'common/enums'
import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'

const resolver: GQLArticleResolvers['collection'] = async (
  { id },
  { input },
  {
    dataSources: {
      atomService,
      articleService,
      connections: { knex },
    },
  }
) => {
  const { take, skip } = fromConnectionArgs(input, { allowTakeAll: true })

  const [countRecord, connections] = await Promise.all([
    knex('article_connection')
      .countDistinct('article_id', 'state')
      .innerJoin('article', 'article.id', 'article_id')
      .where({ entranceId: id, state: ARTICLE_STATE.active })
      .first(),
    articleService.findConnections({
      entranceId: id,
      take,
      skip,
    }),
  ])

  const totalCount = parseInt(
    countRecord ? (countRecord.count as string) : '0',
    10
  )

  return connectionFromPromisedArray(
    atomService.articleIdLoader.loadMany(
      connections.map((connection: Item) => connection.articleId)
    ),
    input,
    totalCount
  )
}

export default resolver
