import { UserStatusToUnreadNoticeCountResolver } from 'definitions'

const resolver: UserStatusToUnreadNoticeCountResolver = (
  { id },
  _,
  { dataSources: { notificationService } }
) => notificationService.notice.countNotice({ userId: id, unread: true })

export default resolver
