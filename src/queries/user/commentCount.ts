import { COMMENT_STATE, COMMENT_TYPE } from 'common/enums'
import { UserStatusToCommentCountResolver } from 'definitions'

const resolver: UserStatusToCommentCountResolver = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  const totalCount = await atomService.count({
    table: 'comment',
    where: {
      authorId: id,
      state: COMMENT_STATE.active,
      type: COMMENT_TYPE.article,
    },
  })

  return totalCount
}

export default resolver
