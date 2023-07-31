import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['requestForDonation'] = async (
  { requestForDonation },
  _
) => requestForDonation ?? null

export default resolver
