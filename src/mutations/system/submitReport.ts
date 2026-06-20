import type { GQLMutationResolvers, ReportType } from '#definitions/index.js'

import { NODE_TYPES, OFFICIAL_NOTICE_EXTEND_TYPE } from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import { UserInputError } from '#common/errors.js'
import { enqueueReportAlert } from '#common/notifications/reportAlert.js'
import { fromGlobalId, toGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['submitReport'] = async (
  _,
  { input: { targetId: globalId, reason } },
  { dataSources: { atomService, notificationService, systemService }, viewer }
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

  if (
    type === NODE_TYPES.Comment &&
    report.moderationOutcome === 'content_collapsed' &&
    report.moderationCaseId
  ) {
    const comment = await atomService.commentIdLoader.load(targetId)
    const appealLink = `https://${environment.siteDomain}/appeals`

    if (comment?.authorId) {
      await notificationService.trigger({
        event: OFFICIAL_NOTICE_EXTEND_TYPE.comment_banned,
        entities: [{ type: 'target', entityTable: 'comment', entity: comment }],
        recipientId: comment.authorId,
        data: {
          link: appealLink,
          moderationSource: 'direct_report',
          publicReason: reason,
          appealLink,
        },
      })
      await systemService.markModerationCaseNoticeSent({
        id: report.moderationCaseId,
        publicReason: reason,
        metadata: {
          reportId: report.id,
          source: 'direct_report',
          targetType: 'comment',
          notificationType: OFFICIAL_NOTICE_EXTEND_TYPE.comment_banned,
        },
      })
    }
  }

  // Emit a report-alert event to SQS. A separate Lambda worker delivers it
  // to the admin Telegram chat. enqueueReportAlert is best-effort and
  // swallows errors internally, so a queue outage cannot fail this mutation.
  const targetGlobalId = toGlobalId({ type, id: targetId })
  await enqueueReportAlert({
    source: 'direct',
    dedupeKey: `direct:${type}:${targetId}`,
    subject: `${type} (${targetGlobalId})`,
    reason,
    ossUrl: `${environment.ossSiteDomain}/reports?targetId=${encodeURIComponent(
      targetGlobalId
    )}`,
  })

  return report
}

export default resolver
