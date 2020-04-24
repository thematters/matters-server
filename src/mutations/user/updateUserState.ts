import { USER_STATE } from 'common/enums'
import { ActionFailedError, UserInputError } from 'common/errors'
import { fromGlobalId, getPunishExpiredDate } from 'common/utils'
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
  if (user.state === USER_STATE.archived || user.state === USER_STATE.banned) {
    throw new ActionFailedError(`user has already been ${state}`)
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
   * Active, Banned
   */
  const updatedUser = await userService.updateInfo(dbId, {
    state,
  })

  if (state === USER_STATE.banned) {
    // trigger notification
    notificationService.trigger({
      event: 'user_banned',
      recipientId: updatedUser.id,
    })

    // insert record into punish_record
    if (typeof banDays === 'number') {
      const expiredAt = getPunishExpiredDate(banDays)
      await userService.baseCreate(
        {
          userId: updatedUser.id,
          state,
          expiredAt,
        },
        'punish_record'
      )
    }
  }

  return updatedUser
}

export default resolver
