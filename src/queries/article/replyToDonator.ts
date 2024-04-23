import type { GQLArticleResolvers } from 'definitions'

import {
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums'

const resolver: GQLArticleResolvers['replyToDonator'] = async (
  { authorId, id: articleId },
  _,
  { viewer, dataSources: { atomService, articleService, paymentService } }
) => {
  if (!viewer.id) {
    return null
  }

  const getReplyToDonator = async () => {
    const { replyToDonator } = await articleService.loadLatestArticleVersion(
      articleId
    )
    return replyToDonator
  }

  const isDonator = async () => {
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
        senderId: viewer.id,
      },
    })
    return count > 0
  }

  const isAuthor = viewer.id === authorId

  return isAuthor || (await isDonator()) ? await getReplyToDonator() : null
}

export default resolver
