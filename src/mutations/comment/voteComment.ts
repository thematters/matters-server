import { PRICE_STATE, SUBSCRIPTION_STATE, USER_STATE } from 'common/enums'
import {
  AuthenticationError,
  ForbiddenByStateError,
  ForbiddenError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToVoteCommentResolver } from 'definitions'

const resolver: MutationToVoteCommentResolver = async (
  _,
  { input: { id, vote } },
  { viewer, dataSources: { atomService, articleService, commentService }, knex }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id: dbId } = fromGlobalId(id)
  const comment = await commentService.dataloader.load(dbId)

  // check target
  const [articleTypeId, circleTypeId] = (
    await atomService.findMany({
      table: 'entity_type',
      whereIn: ['table', ['article', 'circle']],
    })
  ).map((types) => types.id)
  const isTargetArticle = articleTypeId === comment.targetTypeId
  const isTargetCircle = circleTypeId === comment.targetTypeId

  let article: any
  let circle: any
  let targetAuthor: any
  if (isTargetArticle) {
    article = await articleService.dataloader.load(comment.targetId)
    targetAuthor = article.authorId
  } else if (isTargetCircle) {
    circle = await articleService.dataloader.load(comment.targetId)
    targetAuthor = circle.owner
  }

  // check permission
  const isTargetAuthor = targetAuthor === viewer.id
  const isOnboarding = viewer.state === USER_STATE.onboarding
  const isInactive = [
    USER_STATE.banned,
    USER_STATE.archived,
    USER_STATE.frozen,
  ].includes(viewer.state)

  if ((isOnboarding && !isTargetAuthor) || isInactive) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  if (circle && !isTargetAuthor) {
    const records = await knex
      .select()
      .from('circle_subscription_item as csi')
      .join('circle_price', 'circle_price.id', 'csi.price_id')
      .join('circle_subscription as cs', 'cs.id', 'csi.subscription_id')
      .where({
        'cs.state': SUBSCRIPTION_STATE.active,
        'csi.user_id': viewer.id,
        'csi.archived': false,
        'circle_price.circle_id': id,
        'circle_price.state': PRICE_STATE.active,
      })
    const isCircleMember = records && records.length > 0

    if (!isCircleMember) {
      throw new ForbiddenError('only circle members have the permission')
    }
  }

  // check is voted before
  const voted = await commentService.findVotesByUserId({
    userId: viewer.id,
    commentId: dbId,
  })
  if (voted && voted.length > 0) {
    await commentService.removeVotesByUserId({
      userId: viewer.id,
      commentId: dbId,
    })
  }

  await commentService.vote({ commentId: dbId, vote, userId: viewer.id })

  return comment
}

export default resolver
