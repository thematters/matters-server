import type { GQLMutationResolvers, ReportType } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import { UserInputError } from '#common/errors.js'
import { fromGlobalId, toGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['submitReport'] = async (
  _,
  { input: { targetId: globalId, reason } },
  { dataSources: { systemService, telegramService }, viewer }
) => {
  const { type, id: targetId } = fromGlobalId(globalId)
  if (
    ![NODE_TYPES.Article, NODE_TYPES.Comment, NODE_TYPES.Moment].includes(type)
  ) {
    throw new UserInputError('invalid type')
  }
  const report = await systemService.submitReport({
    targetType: type as ReportType,
    targetId,
    reporterId: viewer.id,
    reason,
  })

  // 新增：fire-and-forget Telegram alert to admin chat. The notify call is
  // deliberately not awaited — Telegram is a side-channel; a slow/unhealthy
  // bot must not delay the user's mutation response. The connector itself
  // swallows all errors, but we also `.catch` here as belt-and-suspenders
  // in case it ever throws synchronously.
  const targetGlobalId = toGlobalId({ type, id: targetId })
  void telegramService
    .notifyReport({
      source: 'direct',
      dedupeKey: `direct:${type}:${targetId}`,
      subject: `${type} (${targetGlobalId})`,
      reason,
      ossUrl: `${environment.ossSiteDomain}/reports?targetId=${encodeURIComponent(
        targetGlobalId
      )}`,
    })
    .catch(() => {
      // swallowed; connector logs + reports to Sentry
    })

  return report
}

export default resolver
