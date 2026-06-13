import type { Context, GQLMutationResolvers } from '#definitions/index.js'

import { ForbiddenError } from '#common/errors.js'
import { enqueueSpamSample } from '#common/notifications/spamSample.js'

type ClearCommunityWatchOriginalContentInput = {
  uuid: string
  note?: string | null
}

const resolver = async (
  _: unknown,
  {
    input: { uuid, note },
  }: { input: ClearCommunityWatchOriginalContentInput },
  { viewer, dataSources: { commentService } }: Context
) => {
  if (!viewer.hasRole('admin')) {
    throw new ForbiddenError('viewer has no permission')
  }

  // Last chance to keep this content as a training sample before it's nulled
  // (axis-2 L2). A reversed action means the removal was a false positive →
  // hard-negative ham; otherwise confirmed spam. De-identified, best-effort.
  const action = await commentService.findCommunityWatchActionByUUID(uuid)
  if (action?.originalContent) {
    await enqueueSpamSample({
      label: action.reviewState === 'reversed' ? 0 : 1,
      text: action.originalContent,
      labelSource: `community_watch_clear:${action.reason}`,
      commentId: action.commentId,
      authorId: action.commentAuthorId,
    })
  }

  return commentService.clearCommunityWatchOriginalContent({
    uuid,
    actorId: viewer.id,
    note,
  })
}

export default resolver as GQLMutationResolvers['clearCommunityWatchOriginalContent']
