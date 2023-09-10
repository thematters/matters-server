import type { GQLUserStatusResolvers } from 'definitions'

import { ARTICLE_STATE } from 'common/enums'

const resolver: GQLUserStatusResolvers['totalWordCount'] = async (
  { id },
  _,
  {
    dataSources: {
      connections: { knex },
    },
  }
) => {
  const record = await knex('article')
    .sum('word_count')
    .where({ authorId: id, state: ARTICLE_STATE.active })
    .first()

  return parseInt(record && record.sum ? (record.sum as string) : '0', 10) || 0
}

export default resolver
