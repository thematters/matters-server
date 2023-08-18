import type { GQLMutationResolvers, User } from 'definitions'

import { USER_STATE } from 'common/enums'
import { ActionFailedError, UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { userQueue } from 'connectors/queue'

const resolver: GQLMutationResolvers['updateUserState'] = async (
  _,
  { input: { id: globalId, state, banDays, password, emails } },
  { viewer, dataSources: { userService, notificationService, atomService } }
) => {
  const id = globalId ? fromGlobalId(globalId).id : undefined

  /**
   * archive
   */

  if (state === USER_STATE.archived) {
    if (emails && emails.length > 0) {
      throw new UserInputError('Cannot archive users in batch')
    }
    if (!id) {
      throw new UserInputError('need to provide `id` or `emails`')
    }
    // verify *viewer's* password if target state is `archived`
    if (!password || !viewer.id) {
      throw new UserInputError('`password` is required for archiving user')
    } else {
      await userService.verifyPassword({ password, hash: viewer.passwordHash })
    }

    // sync
    const user = await userService.loadById(id)
    const archivedUser = await userService.archive(id)

    // async
    userQueue.archiveUser({ userId: id })

    if (user.email) {
      notificationService.mail.sendUserDeletedByAdmin({
        to: user.email,
        recipient: {
          displayName: user.displayName,
        },
        language: user.language,
      })
    }

    return [archivedUser]
  }

  /**
   * active, banned, frozen
   */
  const handleUpdateUserState = async (user: User) => {
    if (state === USER_STATE.banned) {
      return await userService.banUser(user.id, { banDays })
    } else if (state !== user.state && user.state === USER_STATE.banned) {
      return await userService.unbanUser(user.id, state)
    } else {
      return await atomService.update({
        table: 'user',
        where: { id: user.id },
        data: {
          state,
        },
      })
    }
  }
  const validateUserState = (user: User) => {
    if (
      user.state === USER_STATE.archived ||
      (state === USER_STATE.banned && user.state === USER_STATE.banned)
    ) {
      throw new ActionFailedError(`user has already been ${user.state}`)
    }
  }

  if (id) {
    const user = (await userService.loadById(id)) as User
    validateUserState(user)
    return [await handleUpdateUserState(user)]
  }

  if (emails && emails.length > 0) {
    const users = await userService.findByEmails(emails)
    // check to prevent unarchiving user
    for (const user of users) {
      validateUserState(user)
    }
    return await Promise.all(users.map((user) => handleUpdateUserState(user)))
  }

  throw new UserInputError('need to provide `id` or `emails`')
}

export default resolver
