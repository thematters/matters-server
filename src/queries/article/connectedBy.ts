import type { GQLArticleResolvers } from '#definitions/index.js'

import { ARTICLE_STATE } from '#common/enums/index.js'
import {
  connectionFromArray,
  fromConnectionArgs,
  loadManyFilterError,
} from '#common/utils/index.js'

const resolver: GQLArticleResolvers['connectedBy'] = async (
  { id },
  { input },
  {
    dataSources: {
      atomService,
      connections: { knex },
    },
  }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const [countRecord, connections] = await Promise.all([
    knex('article_connection')
      .where({ articleId: id })
      .countDistinct('entrance_id')
      .first(),
    atomService.findMany({
      table: 'article_connection',
      where: { articleId: id },
      skip,
      take,
    }),
  ])

  const totalCount = parseInt(
    countRecord ? (countRecord.count as string) : '0',
    10
  )

  const articles = await atomService.articleIdLoader
    .loadMany(connections.map((connection) => connection.entranceId))
    .then(loadManyFilterError)
    .then((items) =>
      items.filter(({ state }) => state === ARTICLE_STATE.active)
    )

  return connectionFromArray(articles, input, totalCount)
}

export default resolver
