import { BatchParams, Context } from 'definitions'
import { toGlobalId } from 'common/utils'

export default {
  User: {
    notices: (
      { id }: { id: string },
      { input: { offset, limit } }: BatchParams,
      { userService }: Context
    ) => userService.findNoticesInBatch(id, offset, limit)
  },
  UserStatus: {
    unreadNoticeCount: (
      { id }: { id: string },
      _: any,
      { userService }: Context
    ) => userService.countUnreadNotice(id)
  },
  Notice: {
    id: ({ id }: { id: string }) => {
      return toGlobalId({ type: 'Notice', id })
    }
  },
  NoticeEntity: {
    node: ({ node }: any) => {
      let type
      if (node.title) {
        type = 'Article'
      } else if (node.content) {
        type = 'Comment'
      } else if (node.userName) {
        type = 'User'
      }
      return { ...node, __type: type }
    }
  }
}
