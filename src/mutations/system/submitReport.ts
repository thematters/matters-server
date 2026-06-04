import type { GQLMutationResolvers, ReportType } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import { UserInputError } from '#common/errors.js'
import { enqueueReportAlert } from '#common/notifications/reportAlert.js'
import { fromGlobalId, toGlobalId } from '#common/utils/index.js'

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
  const report = await systemService.submitReport({
    targetType: type as ReportType,
    targetId,
    reporterId: viewer.id,
    reason,
  })

  // Emit a report-alert event to SQS. A separate Lambda worker delivers it
  // to the admin Telegram chat — Telegram credentials and API calls live
  // only in that worker, not in the API runtime. enqueueReportAlert is
  // best-effort and swallows errors internally, so a queue outage cannot
  // fail this mutation. We still `void` and `.catch` belt-and-suspenders
  // in case the helper itself ever throws synchronously.
  const targetGlobalId = toGlobalId({ type, id: targetId })
  void enqueueReportAlert({
    source: 'direct',
    dedupeKey: `direct:${type}:${targetId}`,
    subject: `${type} (${targetGlobalId})`,
    reason,
    ossUrl: `${environment.ossSiteDomain}/reports?targetId=${encodeURIComponent(
      targetGlobalId
    )}`,
  }).catch(() => {
    // swallowed; producer logs + reports to Sentry
  })

  return report
}

export default resolver
