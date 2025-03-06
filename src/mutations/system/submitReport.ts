import type { GQLMutationResolvers, ReportType } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { UserInputError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['submitReport'] = async (
  _,
  { input: { targetId: globalId, reason } },
  { dataSources: { systemService }, viewer }
) => {
  const { type, id: targetId } = fromGlobalId(globalId)
  if (
    ![NODE_TYPES.Article, NODE_TYPES.Comment, NODE_TYPES.Moment].includes(type)
  ) {
    throw new UserInputError('invalid type')
  }
  return systemService.submitReport({
    targetType: type as ReportType,
    targetId,
    reporterId: viewer.id,
    reason,
  })
}

export default resolver
