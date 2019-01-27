import { MutationToUpdateUserStateResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToUpdateUserStateResolver = async (
  _,
  { input: { id, state, banDays } },
  { viewer, dataSources: { userService, notificationService } }
) => {
  const { id: dbId } = fromGlobalId(id)

  // TODO: banDays

  const user = await userService.baseUpdate(dbId, {
    state,
    updatedAt: new Date()
  })

  // trigger notification
  if (state === 'banned') {
    notificationService.trigger({
      event: 'user_banned',
      recipientId: user.id
    })
  } else if (state === 'frozen') {
    notificationService.trigger({
      event: 'user_frozen',
      recipientId: user.id
    })
  }

  return user
}

export default resolver
