import type { GQLCircleResolvers } from 'definitions'

import { ARTICLE_STATE } from 'common/enums'
import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'

const resolver: GQLCircleResolvers['works'] = async (
  { id },
  { input },
  {
    dataSources: {
      connections: { knex },
    },
  }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const { take, skip } = fromConnectionArgs(input)

  const query = knex
    .from('article_circle')
    .innerJoin('article', 'article.id', 'article_circle.article_id')
    .where({ circleId: id, 'article.state': ARTICLE_STATE.active })

  const [count, articles] = await Promise.all([
    // countQuery,
    query.clone().count().first(),
    // articlesQuery,
    query.orderBy('article_circle.article_id', 'desc').offset(skip).limit(take),
  ])
  const totalCount = parseInt(count ? (count.count as string) : '0', 10)

  return connectionFromPromisedArray(articles, input, totalCount)
}

export default resolver
