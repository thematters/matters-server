import { UserStatusToUnreadNoticeCountResolver } from 'definitions'

const resolver: UserStatusToUnreadNoticeCountResolver = (
  { id },
  _,
  { dataSources: { userService } }
) => userService.countUnreadNotice(id)

export default resolver
