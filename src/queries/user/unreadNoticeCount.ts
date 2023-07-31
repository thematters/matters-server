import type { GQLUserStatusResolvers } from 'definitions'

const resolver: GQLUserStatusResolvers['unreadNoticeCount'] = (
  { id },
  _,
  { dataSources: { notificationService } }
) => notificationService.notice.countNotice({ userId: id, unread: true })

export default resolver
