import {
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums'
import { ArticleToSupportReplyResolver } from 'definitions'

const resolver: ArticleToSupportReplyResolver = async (
  { authorId, articleId, supportReply },
  _,
  { viewer, dataSources }
) => {
  if (!viewer.id) {
    return null
  }

  const isAuthor = viewer.id === authorId
  const isDonator = await _isDonator(viewer.id, articleId, dataSources)
  if (isAuthor || isDonator) {
    return supportReply
  } else {
    return null
  }
}

const _isDonator = async (
  viewerId: string,
  articleId: string,
  { atomService, paymentService }: any
) => {
  const { id: entityTypeId } = await paymentService.baseFindEntityTypeId(
    TRANSACTION_TARGET_TYPE.article
  )
  const count = await atomService.count({
    table: 'transaction',
    where: {
      purpose: TRANSACTION_PURPOSE.donation,
      state: TRANSACTION_STATE.succeeded,
      targetType: entityTypeId,
      targetId: articleId,
      senderId: viewerId,
    },
  })
  return count > 0
}

export default resolver
