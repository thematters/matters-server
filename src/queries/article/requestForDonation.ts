import { ArticleToReplyToDonatorResolver } from 'definitions'

const resolver: ArticleToReplyToDonatorResolver = async (
  { requestForDonation },
  _,
  { dataSources: { draftService } }
) => {
  return requestForDonation
}

export default resolver
