import type { GQLMutationResolvers } from 'definitions'

import { AuthenticationError } from 'common/errors'

const resolver: GQLMutationResolvers['markAllNoticesAsRead'] = async (
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
