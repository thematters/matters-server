import type { GQLMutationResolvers, Article, Circle, Moment } from 'definitions'

import { COMMENT_TYPE, USER_STATE, NOTICE_TYPE } from 'common/enums'
import { ForbiddenByStateError, ForbiddenError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['unvoteComment'] = async (
  _,
  { input: { id } },
  {
    viewer,
    dataSources: {
      atomService,
      paymentService,
      commentService,
      notificationService,
    },
  }
) => {
  if (!viewer.userName) {
    throw new ForbiddenError('user has no username')
  }

  const { id: dbId } = fromGlobalId(id)
  const comment = await atomService.commentIdLoader.load(dbId)

  // check target
  let article: Article
  let circle: Circle | undefined = undefined
  let moment: Moment
  let targetAuthor: string
  if (comment.type === COMMENT_TYPE.article) {
    article = await atomService.articleIdLoader.load(comment.targetId)
    targetAuthor = article.authorId
  } else if (comment.type === COMMENT_TYPE.moment) {
    moment = await atomService.momentIdLoader.load(comment.targetId)
    targetAuthor = moment.authorId
  } else {
    circle = await atomService.circleIdLoader.load(comment.targetId)
    targetAuthor = circle.owner
  }

  // check permission
  const isTargetAuthor = targetAuthor === viewer.id
  const isInactive = [
    USER_STATE.banned,
    USER_STATE.archived,
    USER_STATE.frozen,
  ].includes(viewer.state)

  if (isInactive) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  if (circle && !isTargetAuthor) {
    const isCircleMember = await paymentService.isCircleMember({
      userId: viewer.id,
      circleId: circle.id,
    })

    if (!isCircleMember) {
      throw new ForbiddenError('only circle members have the permission')
    }
  }

  await commentService.unvote({ commentId: dbId, userId: viewer.id })

  if (
    [COMMENT_TYPE.article as string, COMMENT_TYPE.moment as string].includes(
      comment.type
    )
  ) {
    const noticeType =
      comment.type === COMMENT_TYPE.moment
        ? NOTICE_TYPE.moment_comment_liked
        : NOTICE_TYPE.article_comment_liked
    notificationService.cancel(`${noticeType}:${viewer.id}:${dbId}`)
  }

  return comment
}

export default resolver
