import { OFFICIAL_NOTICE_EXTEND_TYPE, USER_STATE } from 'common/enums/index.js'
import { ActionFailedError, UserInputError } from 'common/errors.js'
import logger from 'common/logger.js'
import { fromGlobalId, getPunishExpiredDate } from 'common/utils/index.js'
import { userQueue } from 'connectors/queue/index.js'
import { MutationToUpdateUserStateResolver } from 'definitions'

const resolver: MutationToUpdateUserStateResolver = async (
  _,
  { input: { id, state, banDays, password, emails } },
  { viewer, dataSources: { userService, notificationService, atomService } }
) => {
  // handlers for cleanup and notification
  const handleBan = async (userId: string) => {
    // trigger notification
    notificationService.trigger({
      event: OFFICIAL_NOTICE_EXTEND_TYPE.user_banned,
      recipientId: userId,
    })

    // insert record into punish_record
    if (typeof banDays === 'number') {
      const expiredAt = getPunishExpiredDate(banDays)
      await userService.baseCreate(
        {
          userId,
          state,
          expiredAt,
        },
        'punish_record'
      )
    }
  }

  // clean up punish recods if team manually recover it from ban
  const handleUnban = (userId: string) =>
    userService.archivePunishRecordsByUserId({
      userId,
      state: USER_STATE.banned,
    })

  const isArchived = state === USER_STATE.archived

  /**
   * Batch update with email array
   */
  if (emails && emails.length > 0) {
    if (isArchived) {
      throw new UserInputError('Cannot archive users in batch')
    }

    const updatedUsers = await userService.knex
      .whereIn('email', emails)
      .update({ state })
      .into(userService.table)
      .returning('*')
      .then((users) =>
        users.map((batchUpdatedUser) => {
          const { id: userId } = batchUpdatedUser
          if (state === USER_STATE.banned) {
            handleBan(userId)
          }

          return batchUpdatedUser
        })
      )

    return updatedUsers
  }

  if (!id) {
    throw new UserInputError('need to provide `id` or `emails`')
  }

  const { id: dbId } = fromGlobalId(id)
  const user = await userService.dataloader.load(dbId)

  // check to prevent unarchiving user
  if (
    user.state === USER_STATE.archived ||
    (state === USER_STATE.banned && user.state === USER_STATE.banned)
  ) {
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

    return [archivedUser]
  }

  /**
   * active, banned, frozen
   */
  const updatedUser = await atomService.update({
    table: 'user',
    where: { id: dbId },
    data: {
      state,
    },
  })

  try {
    await atomService.es.client.update({
      index: 'user',
      id: dbId,
      body: {
        doc: {
          state,
        },
      },
    })
  } catch (err) {
    logger.error(err)
  }

  if (state === USER_STATE.banned) {
    handleBan(updatedUser.id)
  } else if (state !== user.state && user.state === USER_STATE.banned) {
    handleUnban(updatedUser.id)
  }

  return [updatedUser]
}

export default resolver
