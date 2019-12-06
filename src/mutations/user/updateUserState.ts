import { USER_STATE } from 'common/enums'
import { UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToUpdateUserStateResolver } from 'definitions'

const resolver: MutationToUpdateUserStateResolver = async (
  _,
  { input: { id, state, banDays, password } },
  { viewer, dataSources: { userService, notificationService } }
) => {
  const { id: dbId } = fromGlobalId(id)

  // verify password if target state is `archived`
  if (state === USER_STATE.archived) {
    if (!password || !viewer.id) {
      throw new UserInputError('`password` is required for archiving user')
    } else {
      await userService.verifyPassword({ password, hash: viewer.passwordHash })
    }
  }

  const user = await userService.updateInfo(dbId, {
    state
  })

  // trigger notification
  if (state === USER_STATE.banned) {
    notificationService.trigger({
      event: 'user_banned',
      recipientId: user.id
    })
  } else if (state === USER_STATE.frozen) {
    notificationService.trigger({
      event: 'user_frozen',
      recipientId: user.id
    })
  }

  return user
}

export default resolver
