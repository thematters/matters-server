import type { GQLCommentResolvers } from 'definitions'

import {
  COMMENT_TYPE,
  COMMENT_STATE,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums'

const resolver: GQLCommentResolvers['fromDonator'] = async (
  { authorId, targetId, type, state },
  _,
  { viewer, dataSources: { atomService, articleService } }
) => {
  if (!targetId || type !== COMMENT_TYPE.article) {
    return false
  }

  const isActive = state === COMMENT_STATE.active
  const isCollapsed = state === COMMENT_STATE.collapsed
  const isAdmin = viewer.hasRole('admin')
  if (isActive || isCollapsed || isAdmin) {
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
  } else {
    return false
  }
}

export default resolver
