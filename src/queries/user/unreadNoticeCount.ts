import type { GQLUserStatusResolvers } from 'definitions'

const resolver: GQLUserStatusResolvers['unreadNoticeCount'] = (
  { id },
  _,
  { dataSources: { notificationService } }
) => {
  if (id === null) {
    return 0
  }
  return notificationService.countNotice({ userId: id, unread: true })
}

export default resolver
