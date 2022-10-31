import { ArticleToSupportReplyResolver } from 'definitions'

const resolver: ArticleToSupportReplyResolver = async (
  { supportReply },
  _,
  { dataSources: { draftService } }
) => {
  return supportReply
}

export default resolver
