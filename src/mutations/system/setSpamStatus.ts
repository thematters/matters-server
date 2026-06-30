import type { GQLMutationResolvers } from '#definitions/index.js'

import {
  AUDIT_LOG_ACTION,
  AUDIT_LOG_STATUS,
  NODE_TYPES,
} from '#common/enums/index.js'
import { UserInputError } from '#common/errors.js'
import { auditLog } from '#common/logger.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['setSpamStatus'] = async (
  _,
  { input: { id: globalId, isSpam } },
  { dataSources: { atomService, publicationService }, viewer }
) => {
  const { type, id } = fromGlobalId(globalId)
  const actorId = viewer && 'id' in viewer ? viewer.id : null

  if (!id) {
    throw new UserInputError('id is invalid')
  }

  switch (type) {
    case NODE_TYPES.Article: {
      const before = await atomService.findUnique({
        table: 'article',
        where: { id },
      })
      const article = await atomService.update({
        table: 'article',
        where: { id },
        data: { isSpam },
      })
      auditLog({
        actorId,
        action: AUDIT_LOG_ACTION.setSpamStatus,
        status: AUDIT_LOG_STATUS.succeeded,
        entity: 'article',
        entityId: id,
        oldValue: JSON.stringify({ isSpam: before?.isSpam ?? null }),
        newValue: JSON.stringify({ isSpam }),
      })

      if (!isSpam) {
        await publicationService.runPostProcessing(article, false)
      }

      return { ...article, __type: NODE_TYPES.Article } as any
    }

    case NODE_TYPES.Comment: {
      const before = await atomService.findUnique({
        table: 'comment',
        where: { id },
      })
      const comment = await atomService.update({
        table: 'comment',
        where: { id },
        data: { isSpam },
      })
      auditLog({
        actorId,
        action: AUDIT_LOG_ACTION.setSpamStatus,
        status: AUDIT_LOG_STATUS.succeeded,
        entity: 'comment',
        entityId: id,
        oldValue: JSON.stringify({ isSpam: before?.isSpam ?? null }),
        newValue: JSON.stringify({ isSpam }),
      })

      return { ...comment, __type: NODE_TYPES.Comment } as any
    }

    case NODE_TYPES.Moment: {
      const before = await atomService.findUnique({
        table: 'moment',
        where: { id },
      })
      const moment = await atomService.update({
        table: 'moment',
        where: { id },
        data: { isSpam },
      })
      auditLog({
        actorId,
        action: AUDIT_LOG_ACTION.setSpamStatus,
        status: AUDIT_LOG_STATUS.succeeded,
        entity: 'moment',
        entityId: id,
        oldValue: JSON.stringify({ isSpam: before?.isSpam ?? null }),
        newValue: JSON.stringify({ isSpam }),
      })

      return { ...moment, __type: NODE_TYPES.Moment } as any
    }

    default:
      throw new UserInputError(`Unsupported content type: ${type}`)
  }
}

export default resolver
