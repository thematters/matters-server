import type { GQLWritingChallengeResolvers } from '#definitions/index.js'

import { QUOTE_STATE } from '#common/enums/index.js'
import { excludeStateRestrictedAuthors } from '#common/utils/index.js'

const resolver: GQLWritingChallengeResolvers['quoteCount'] = async (
  { id },
  _,
  {
    viewer,
    dataSources: {
      connections: { knexRO },
    },
  }
) => {
  // keep in sync with the `quotes` resolver: restricted authors' quotes are
  // hidden from the public wall, so they must not inflate the public count
  const countResult = await knexRO('quote')
    .join('article', 'article.id', 'quote.articleId')
    .where({ 'quote.campaignId': id, 'quote.state': QUOTE_STATE.active })
    .modify((builder) => {
      if (!viewer.hasRole('admin')) {
        builder.modify(excludeStateRestrictedAuthors)
      }
    })
    .count()
    .first()

  return parseInt(String(countResult?.count ?? 0), 10)
}

export default resolver
