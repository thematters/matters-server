import { BatchParams, Context } from 'definitions'

export default {
  User: {
    notices: (
      { id }: { id: number },
      { input: { offset, limit } }: BatchParams,
      { userService }: Context
    ) => userService.findNoticesInBatch(id, offset, limit)
  },
  UserStatus: {
    unreadNoticeCount: (
      { id }: { id: number },
      _: any,
      { userService }: Context
    ) => userService.countUnreadNotice(id)
  },
  NoticeEntity: {
    __resolveType: (obj: any) => {
      if (obj.upstream) {
        return 'Article'
      }

      if (obj.user_name) {
        return 'User'
      }

      return 'Comment'
    }
  }
}
