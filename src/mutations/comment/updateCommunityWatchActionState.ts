import type {
  Context,
  GQLMutationResolvers,
  CommunityWatchActionReason,
  CommunityWatchAppealState,
  CommunityWatchReviewState,
} from '#definitions/index.js'

import { ForbiddenError } from '#common/errors.js'

type UpdateCommunityWatchActionStateInput = {
  uuid: string
  appealState?: CommunityWatchAppealState | null
  reviewState?: CommunityWatchReviewState | null
  reason?: CommunityWatchActionReason | null
  note?: string | null
}

const resolver = async (
  _: unknown,
  {
    input: { uuid, appealState, reviewState, reason, note },
  }: { input: UpdateCommunityWatchActionStateInput },
  { viewer, dataSources: { commentService } }: Context
) => {
  if (!viewer.hasRole('admin')) {
    throw new ForbiddenError('viewer has no permission')
  }

  return commentService.updateCommunityWatchActionState({
    uuid,
    actorId: viewer.id,
    appealState,
    reviewState,
    reason,
    note,
  })
}

export default resolver as GQLMutationResolvers['updateCommunityWatchActionState']
