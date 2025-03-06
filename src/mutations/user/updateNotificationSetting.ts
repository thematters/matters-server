import { AuthenticationError, ForbiddenError } from 'common/errors.js'
import { GQLMutationResolvers } from 'definitions/index.js'

const resolver: GQLMutationResolvers['updateNotificationSetting'] = async (
  _,
  { input: { type, enabled } },
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (type === 'email' && !viewer.email) {
    throw new ForbiddenError('email is required to enable email notification')
  }

  let _type: string = type
  if (type === 'articleNewComment') {
    _type = 'newComment'
  }
  if (type === 'articleNewAppreciation') {
    _type = 'newLike'
  }

  const notifySetting = await userService.findNotifySetting(viewer.id)

  await userService.updateNotifySetting(notifySetting.id, {
    [_type]: enabled,
  })

  return viewer
}

export default resolver
