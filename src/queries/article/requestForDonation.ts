import type { GQLArticleToReplyResolvers } from 'definitions'

const resolver: GQLArticleToReplyResolvers['donator'] = async (
  { requestForDonation },
  _,
  { dataSources: { draftService } }
) => requestForDonation

export default resolver
