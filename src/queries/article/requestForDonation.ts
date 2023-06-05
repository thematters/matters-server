import { ArticleToReplyToDonatorResolver } from 'definitions'

const resolver: ArticleToReplyToDonatorResolver = async (
  { requestForDonation },
  _,
  { dataSources: { draftService } }
) => requestForDonation

export default resolver
