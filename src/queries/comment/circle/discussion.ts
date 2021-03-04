import {
  COMMENT_STATE,
  COMMENT_TYPE,
  PRICE_STATE,
  SUBSCRIPTION_STATE,
} from 'common/enums'
import { connectionFromArray, cursorToIndex } from 'common/utils'
import { CircleToDiscussionResolver } from 'definitions'

const resolver: CircleToDiscussionResolver = async (
  { id, owner },
  { input },
  { viewer, dataSources: { atomService }, knex }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const records = await knex
    .select()
    .from('circle_subscription_item as csi')
    .join('circle_price', 'circle_price.id', 'csi.price_id')
    .join('circle_subscription as cs', 'cs.id', 'csi.subscription_id')
    .where({
      'csi.user_id': viewer.id,
      'csi.archived': false,
      'circle_price.circle_id': id,
      'circle_price.state': PRICE_STATE.active,
    })
    .whereIn('cs.state', [
      SUBSCRIPTION_STATE.active,
      SUBSCRIPTION_STATE.trialing,
    ])
  const isCircleMember = records && records.length > 0
  const isCircleOwner = viewer.id === owner

  if (!isCircleMember && !isCircleOwner) {
    return connectionFromArray([], input)
  }

  const { first: take, after } = input
  const skip = cursorToIndex(after) + 1

  const where = {
    state: COMMENT_STATE.active,
    parentCommentId: null,
    targetId: id,
    type: COMMENT_TYPE.circleDiscussion,
  }
  const [totalCount, comments] = await Promise.all([
    atomService.count({
      table: 'comment',
      where,
    }),
    atomService.findMany({
      table: 'comment',
      where,
      skip,
      take,
      orderBy: [{ column: 'created_at', order: 'desc' }],
    }),
  ])
  return connectionFromArray(comments, input, totalCount)
}

export default resolver
