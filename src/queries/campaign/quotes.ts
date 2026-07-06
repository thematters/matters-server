import type { GQLWritingChallengeResolvers } from '#definitions/index.js'

import { QUOTE_STATE } from '#common/enums/index.js'
import {
  connectionFromArray,
  excludeStateRestrictedAuthors,
  fromConnectionArgs,
} from '#common/utils/index.js'

const DEFAULT_TAKE = 12

// public quote wall of a campaign; `random: true` returns a random sample
// (the "shuffle" button simply refetches), in which case `after` is ignored
const resolver: GQLWritingChallengeResolvers['quotes'] = async (
  { id },
  { input },
  {
    viewer,
    dataSources: {
      connections: { knexRO },
    },
  }
) => {
  const { random } = input
  const { take, skip } = fromConnectionArgs(input, {
    defaultTake: DEFAULT_TAKE,
  })

  // hide quotes whose article author is frozen / banned / archived from the
  // public wall; admins still see them so the OSS management list stays whole
  const baseQuery = () =>
    knexRO('quote')
      .join('article', 'article.id', 'quote.articleId')
      .where({ 'quote.campaignId': id, 'quote.state': QUOTE_STATE.active })
      .modify((builder) => {
        if (!viewer.hasRole('admin')) {
          builder.modify(excludeStateRestrictedAuthors)
        }
      })

  const [quotes, countResult] = await Promise.all([
    baseQuery()
      .select('quote.*')
      .modify((builder) => {
        if (random) {
          builder.orderByRaw('random()')
        } else {
          builder.orderBy('quote.id', 'desc').offset(skip)
        }
      })
      .limit(take),
    baseQuery().count().first(),
  ])

  const totalCount = parseInt(String(countResult?.count ?? 0), 10)

  return connectionFromArray(
    quotes,
    random ? { first: take } : input,
    totalCount
  )
}

export default resolver
