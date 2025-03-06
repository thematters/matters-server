import type { GQLMutationResolvers } from '#definitions/index.js'

import { AuthenticationError } from '#common/errors.js'

const resolver: GQLMutationResolvers['markAllNoticesAsRead'] = async (
  _,
  __,
  { viewer, dataSources: { notificationService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  await notificationService.markAllNoticesAsRead(viewer.id)

  return true
}

export default resolver
