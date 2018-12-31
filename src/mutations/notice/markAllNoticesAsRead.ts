import { Resolver } from 'definitions'

const resolver: Resolver = async (
  root,
  _,
  { viewer, dataSources: { notificationService } }
) => {
  if (!viewer.id) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  await notificationService.noticeService.markAllNoticesAsRead(viewer.id)

  return true
}

export default resolver
