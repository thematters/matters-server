import type { GQLUserStatusResolvers } from 'definitions'

import { ARTICLE_STATE } from 'common/enums'

const resolver: GQLUserStatusResolvers['totalWordCount'] = async (
  { id },
  _,
  {
    dataSources: {
      connections: { knexRO },
    },
  }
) => {
  const record = await knexRO('article_version_newest')
    .sum('word_count')
    .whereIn(
      'articleId',
      knexRO('article')
        .where({ authorId: id, state: ARTICLE_STATE.active })
        .select('id')
    )
    .first()

  return parseInt(record && record.sum ? (record.sum as string) : '0', 10) || 0
}

export default resolver
