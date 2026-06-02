import type { GQLMutationResolvers, ValueOf } from '#definitions/index.js'

import {
  AUDIT_LOG_ACTION,
  AUDIT_LOG_STATUS,
  MOMENT_FEED_STATE,
} from '#common/enums/index.js'
import { AuthenticationError, UserInputError } from '#common/errors.js'
import { auditLog } from '#common/logger.js'
import { fromGlobalId } from '#common/utils/index.js'

const auditActionByState: Partial<
  Record<ValueOf<typeof MOMENT_FEED_STATE>, ValueOf<typeof AUDIT_LOG_ACTION>>
> = {
  [MOMENT_FEED_STATE.approved]: AUDIT_LOG_ACTION.approveMomentFeedApplication,
  [MOMENT_FEED_STATE.rejected]: AUDIT_LOG_ACTION.rejectMomentFeedApplication,
  [MOMENT_FEED_STATE.revoked]: AUDIT_LOG_ACTION.revokeMomentFeedApplication,
}

const resolver: GQLMutationResolvers['updateMomentFeedApplicationState'] =
  async (
    _,
    { input: { id: globalId, state } },
    { viewer, dataSources: { momentService, atomService } }
  ) => {
    if (!viewer.id) {
      throw new AuthenticationError('visitor has no permission')
    }

    const { id: userId, type } = fromGlobalId(globalId)
    if (type !== 'User') {
      throw new UserInputError('invalid id')
    }

    const action = auditActionByState[state]
    if (!action) {
      throw new UserInputError(`invalid target state ${state}`)
    }

    try {
      const record = await momentService.reviewMomentFeedApplication({
        userId,
        state,
        reviewerId: viewer.id,
      })

      auditLog({
        actorId: viewer.id,
        action,
        entity: 'moment_feed_user',
        entityId: record.id,
        status: AUDIT_LOG_STATUS.succeeded,
      })

      return atomService.userIdLoader.load(userId)
    } catch (error) {
      auditLog({
        actorId: viewer.id,
        action,
        entity: 'moment_feed_user',
        status: AUDIT_LOG_STATUS.failed,
        remark: error instanceof Error ? error.message : `${error}`,
      })
      throw error
    }
  }

export default resolver
