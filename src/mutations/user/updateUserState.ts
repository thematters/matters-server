import { USER_STATE } from 'common/enums'
import { ActionFailedError, UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { userQueue } from 'connectors/queue'
import { MutationToUpdateUserStateResolver } from 'definitions'

const resolver: MutationToUpdateUserStateResolver = async (
  _,
  { input: { id, state, banDays, password } },
  { viewer, dataSources: { userService, notificationService } }
) => {
  const { id: dbId } = fromGlobalId(id)
  const isArchived = state === USER_STATE.archived
  const user = await userService.dataloader.load(dbId)

  // check
  if (user.state === USER_STATE.archived) {
    throw new ActionFailedError('user has already been archived')
  }

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

    // sync
    const archivedUser = await userService.archive(dbId)

    // async
    userQueue.archiveUser({ userId: archivedUser.id })

    notificationService.mail.sendUserDeletedByAdmin({
      to: user.email,
      recipient: {
        displayName: user.displayName,
      },
      language: user.language,
    })

    return archivedUser
  }

  /**
   * Active, Banned, Frozen
   */
  const updatedUser = await userService.updateInfo(dbId, {
    state,
  })

  // trigger notification
  if (state === USER_STATE.banned) {
    notificationService.trigger({
      event: 'user_banned',
      recipientId: updatedUser.id,
    })
  } else if (state === USER_STATE.frozen) {
    notificationService.trigger({
      event: 'user_frozen',
      recipientId: updatedUser.id,
    })
  }

  return updatedUser
}

export default resolver
