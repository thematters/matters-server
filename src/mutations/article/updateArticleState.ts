import type { GQLMutationResolvers } from '#definitions/index.js'

import {
  ARTICLE_STATE,
  AUDIT_LOG_ACTION,
  AUDIT_LOG_STATUS,
  OFFICIAL_NOTICE_EXTEND_TYPE,
} from '#common/enums/index.js'
import { auditLog } from '#common/logger.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['updateArticleState'] = async (
  _,
  { input: { id, state } },
  { dataSources: { atomService, notificationService }, viewer }
) => {
  const { id: dbId } = fromGlobalId(id)
  const actorId = viewer && 'id' in viewer ? viewer.id : null

  const before = await atomService.findUnique({
    table: 'article',
    where: { id: dbId },
  })

  const article = await atomService.update({
    table: 'article',
    where: { id: dbId },
    data: {
      state,
    },
  })
  auditLog({
    actorId,
    action: AUDIT_LOG_ACTION.updateArticleState,
    status: AUDIT_LOG_STATUS.succeeded,
    entity: 'article',
    entityId: dbId,
    oldValue: JSON.stringify({ state: before?.state ?? null }),
    newValue: JSON.stringify({ state }),
  })

  // trigger notification
  if (state === ARTICLE_STATE.banned) {
    notificationService.trigger({
      event: OFFICIAL_NOTICE_EXTEND_TYPE.article_banned,
      entities: [{ type: 'target', entityTable: 'article', entity: article }],
      recipientId: article.authorId,
    })
  }
  return article
}

export default resolver
