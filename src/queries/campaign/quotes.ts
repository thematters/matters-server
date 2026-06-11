import type { GQLWritingChallengeResolvers } from '#definitions/index.js'

import { QUOTE_STATE } from '#common/enums/index.js'
import { connectionFromArray } from '#common/utils/index.js'

const DEFAULT_TAKE = 12

// public quote wall of a campaign; `random: true` returns a random sample
// (the "shuffle" button simply refetches)
const resolver: GQLWritingChallengeResolvers['quotes'] = async (
  { id },
  { input: { first, random } },
  { dataSources: { atomService, connections: { knexRO } } }
) => {
  const take = first ?? DEFAULT_TAKE

  const [quotes, totalCount] = await Promise.all([
    knexRO('quote')
      .select()
      .where({ campaignId: id, state: QUOTE_STATE.active })
      .modify((builder) => {
        if (random) {
          builder.orderByRaw('random()')
        } else {
          builder.orderBy('id', 'desc')
        }
      })
      .limit(take),
    atomService.count({
      table: 'quote',
      where: { campaignId: id, state: QUOTE_STATE.active },
    }),
  ])

  return connectionFromArray(quotes, { first: take }, totalCount)
}

export default resolver
