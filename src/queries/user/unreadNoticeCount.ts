import { UserStatusToUnreadNoticeCountResolver } from 'definitions'

const resolver: UserStatusToUnreadNoticeCountResolver = (
  { id },
  _,
  { dataSources: { notificationService } }
) => notificationService.noticeService.countUnreadNotice(id)

export default resolver
