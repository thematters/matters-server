import { COMMENT_STATE, COMMENT_TYPE } from 'common/enums/index.js'
import { CircleToDiscussionThreadCountResolver } from 'definitions'

const resolver: CircleToDiscussionThreadCountResolver = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  const count = await atomService.count({
    table: 'comment',
    where: {
      state: COMMENT_STATE.active,
      parentCommentId: null,
      targetId: id,
      type: COMMENT_TYPE.circleDiscussion,
    },
  })

  return count
}

export default resolver
