import { USER_STATE } from 'common/enums'
import { UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToUpdateUserStateResolver, User } from 'definitions'

const resolver: MutationToUpdateUserStateResolver = async (
  _,
  { input: { id, state, banDays, password } },
  { viewer, dataSources: { userService, notificationService } }
) => {
  const { id: dbId } = fromGlobalId(id)
  const isArchived = state === USER_STATE.archived

  /**
   * Archive
   */
  if (isArchived) {
    // verify password if target state is `archived`
    if (!password || !viewer.id) {
      throw new UserInputError('`password` is required for archiving user')
    } else {
      await userService.verifyPassword({ password, hash: viewer.passwordHash })
    }

    const archivedUser = await userService.archive(dbId)

    notificationService.mail.sendUserDeletedByAdmin({
      to: archivedUser.email,
      recipient: {
        displayName: archivedUser.displayName
      },
      language: archivedUser.language
    })

    return archivedUser
  }

  /**
   * Active, Banned, Frozen
   */
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
