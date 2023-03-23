import {
  COMMENT_TYPE,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums/index.js'
import { CommentToFromDonatorResolver } from 'definitions'

const resolver: CommentToFromDonatorResolver = async (
  { authorId, targetId, type },
  _,
  { dataSources: { atomService, articleService } }
) => {
  if (!targetId || type !== COMMENT_TYPE.article) {
    return false
  }

  const { id: entityTypeId } = await articleService.baseFindEntityTypeId(
    TRANSACTION_TARGET_TYPE.article
  )

  const record = await atomService.findFirst({
    table: 'transaction',
    where: {
      targetId,
      targetType: entityTypeId,
      senderId: authorId,
      state: TRANSACTION_STATE.succeeded,
      purpose: TRANSACTION_PURPOSE.donation,
    },
  })

  return !!record
}

export default resolver
