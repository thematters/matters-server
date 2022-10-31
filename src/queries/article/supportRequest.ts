import { ArticleToSupportReplyResolver } from 'definitions'

const resolver: ArticleToSupportReplyResolver = async (
  { supportRequest },
  _,
  { dataSources: { draftService } }
) => {
  return supportRequest
}

export default resolver
