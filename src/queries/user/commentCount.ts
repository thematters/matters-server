import { COMMENT_STATE } from 'common/enums'
import { GQLCommentType, UserStatusToCommentCountResolver } from 'definitions'

const resolver: UserStatusToCommentCountResolver = async (
  { id },
  _,
  { knex }
) => {
  const record = await knex
    .count()
    .from('circle_subscription_item as csi')
    .innerJoin('circle_price', 'circle_price.id', 'csi.price_id')
    .where({
      authorId: id,
      state: COMMENT_STATE.active,
      type: GQLCommentType.article,
    })
    .first()

  const totalCount = parseInt(record ? (record.count as string) : '0', 10)

  return totalCount
}

export default resolver
