import type { Context, GQLMutationResolvers } from '#definitions/index.js'

import {
  COMMENT_TYPE,
  NODE_TYPES,
  OFFICIAL_NOTICE_EXTEND_TYPE,
} from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import { ForbiddenError } from '#common/errors.js'
import { invalidateFQC } from '@matters/apollo-response-cache'

type RestoreCommunityWatchCommentInput = {
  uuid: string
  note?: string | null
}

const communityWatchRecordLink = (uuid: string) => {
  const baseUrl =
    process.env.COMMUNITY_WATCH_URL ?? 'https://community-watch.matters.town'
  return `${baseUrl.replace(/\/$/, '')}/records/${uuid}/`
}

const resolver = async (
  _: unknown,
  { input: { uuid, note } }: { input: RestoreCommunityWatchCommentInput },
  {
    viewer,
    dataSources: { commentService, connections, notificationService },
  }: Context
) => {
  if (!viewer.hasRole('admin')) {
    throw new ForbiddenError('viewer has no permission')
  }

  const { action, comment } = await commentService.restoreCommunityWatchComment(
    {
      uuid,
      actorId: viewer.id,
      note,
    }
  )
  const recordLink = communityWatchRecordLink(action.uuid)
  const appealLink = `https://${environment.siteDomain}/appeals`
  const moderationNoticeData = {
    link: recordLink,
    moderationSource: 'community_watch',
    publicReason: action.reason,
    appealLink,
  }
  const commentEntity = {
    type: 'target' as const,
    entityTable: 'comment' as const,
    entity: comment,
  }
  const commentAuthorId = action.commentAuthorId ?? comment.authorId

  await Promise.all([
    commentAuthorId
      ? notificationService.trigger({
          event: OFFICIAL_NOTICE_EXTEND_TYPE.community_watch_comment_restored,
          recipientId: commentAuthorId,
          entities: [commentEntity],
          data: moderationNoticeData,
        })
      : Promise.resolve(),
    action.actorId && action.actorId !== viewer.id
      ? notificationService.trigger({
          event: OFFICIAL_NOTICE_EXTEND_TYPE.community_watch_action_reversed,
          recipientId: action.actorId,
          entities: [commentEntity],
          data: moderationNoticeData,
        })
      : Promise.resolve(),
  ])

  await commentService.syncCommunityWatchModerationCaseNoticeSent({ action })

  await invalidateFQC({
    node: {
      id: comment.targetId,
      type:
        comment.type === COMMENT_TYPE.article
          ? NODE_TYPES.Article
          : NODE_TYPES.Moment,
    },
    redis: connections.redis,
  })

  return action
}

export default resolver as GQLMutationResolvers['restoreCommunityWatchComment']
