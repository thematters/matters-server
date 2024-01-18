import type { GQLMutationResolvers, ReportType } from 'definitions'

import { NODE_TYPES } from 'common/enums'
import { UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['submitReport'] = async (
  _,
  { input: { targetId: globalId, reason } },
  { dataSources: { systemService }, viewer }
) => {
  const { type, id: targetId } = fromGlobalId(globalId)
  if (![NODE_TYPES.Article, NODE_TYPES.Comment].includes(type)) {
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
