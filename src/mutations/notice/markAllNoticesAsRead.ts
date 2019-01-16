import { AuthenticationError } from 'apollo-server'
import { MutationToMarkAllNoticesAsReadResolver } from 'definitions'

const resolver: MutationToMarkAllNoticesAsReadResolver = async (
  root,
  _,
  { viewer, dataSources: { notificationService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  await notificationService.noticeService.markAllNoticesAsRead(viewer.id)

  return true
}

export default resolver
