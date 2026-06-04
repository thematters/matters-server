import type { GQLMutationResolvers } from '#definitions/index.js'

import { AUDIT_LOG_ACTION, AUDIT_LOG_STATUS } from '#common/enums/index.js'
import { AuthenticationError, ForbiddenError } from '#common/errors.js'
import { auditLog } from '#common/logger.js'

const resolver: GQLMutationResolvers['applyMomentFeed'] = async (
  _,
  __,
  { viewer, dataSources: { momentService, systemService, atomService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const feature = await systemService.getFeatureFlag('hottest_moment_feed')
  if (
    feature &&
    !(await systemService.isFeatureEnabled(feature.flag, viewer))
  ) {
    throw new ForbiddenError(
      'hottest moment feed is not enabled for the viewer'
    )
  }

  const record = await momentService.applyMomentFeed(viewer)

  auditLog({
    actorId: viewer.id,
    action: AUDIT_LOG_ACTION.applyMomentFeed,
    entity: 'moment_feed_user',
    entityId: record.id,
    status: AUDIT_LOG_STATUS.succeeded,
  })

  return atomService.userIdLoader.load(viewer.id)
}

export default resolver
