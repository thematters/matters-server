import type { GQLArticleResolvers } from 'definitions'

import { ARTICLE_STATE } from 'common/enums'
import {
  connectionFromPromisedArray,
  fromConnectionArgs,
  loadManyFilterError,
} from 'common/utils'

const resolver: GQLArticleResolvers['collectedBy'] = async (
  { articleId },
  { input },
  { dataSources: { atomService, articleService, draftService }, knex }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const [countRecord, connections] = await Promise.all([
    knex('article_connection')
      .where({ articleId })
      .countDistinct('entrance_id')
      .first(),
    atomService.findMany({
      table: 'article_connection',
      where: { articleId },
      skip,
      take,
    }),
  ])

  const totalCount = parseInt(
    countRecord ? (countRecord.count as string) : '0',
    10
  )

  const articles = await articleService.dataloader
    .loadMany(connections.map((connection) => connection.entranceId))
    .then(loadManyFilterError)
    .then((items) =>
      items.filter(({ state }) => state === ARTICLE_STATE.active)
    )

  return connectionFromPromisedArray(
    draftService.loadByIds(articles.map((article) => article.draftId)),
    input,
    totalCount
  )
}

export default resolver
