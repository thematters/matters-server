import { AuthenticationError } from 'common/errors.js'
import { MutationToMarkAllNoticesAsReadResolver } from 'definitions'

const resolver: MutationToMarkAllNoticesAsReadResolver = async (
  root,
  _,
  { viewer, dataSources: { notificationService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  await notificationService.notice.markAllNoticesAsRead(viewer.id)

  return true
}

export default resolver
