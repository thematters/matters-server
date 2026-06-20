import type { GQLWritingChallengeResolvers } from '#definitions/index.js'

import { QUOTE_STATE } from '#common/enums/index.js'

const resolver: GQLWritingChallengeResolvers['quoteCount'] = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  const count = await atomService.count({
    table: 'quote',
    where: { campaignId: id, state: QUOTE_STATE.active },
  })

  return count
}

export default resolver
