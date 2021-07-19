import {
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums'
import { CommentToFromDonatorResolver } from 'definitions'

const resolver: CommentToFromDonatorResolver = async (
  { authorId, articleId },
  _,
  { dataSources: { atomService, articleService } }
) => {
  const { id: entityTypeId } = await articleService.baseFindEntityTypeId(
    TRANSACTION_TARGET_TYPE.article
  )

  const record = await atomService.findFirst({
    table: 'transaction',
    where: {
      targetId: articleId,
      targetType: entityTypeId,
      senderId: authorId,
      state: TRANSACTION_STATE.succeeded,
      purpose: TRANSACTION_PURPOSE.donation,
    },
  })

  return !!record
}

export default resolver
