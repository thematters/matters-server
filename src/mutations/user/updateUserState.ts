import type { GQLMutationResolvers, User } from '#definitions/index.js'

import { USER_STATE } from '#common/enums/index.js'
import { ActionFailedError, UserInputError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

import {
  invalidateRecommendationAuthorsCache,
  invalidateUserContentCaches,
} from './utils.js'

const resolver: GQLMutationResolvers['updateUserState'] = async (
  _,
  { input: { id: globalId, state, banDays, password, emails } },
  {
    viewer,
    dataSources: {
      userService,
      articleService,
      notificationService,
      atomService,
      connections: { redis, objectCacheRedis },
      queues: { userQueue },
    },
  }
) => {
  const id = globalId ? fromGlobalId(globalId).id : undefined

  const invalidateUserCaches = async (userId: string) => {
    await invalidateUserContentCaches(userId, { articleService, redis })
    await invalidateRecommendationAuthorsCache({
      atomService,
      objectCacheRedis,
    })
  }

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
    const user = await atomService.userIdLoader.load(id)
    const archivedUser = await userService.archive(id)
    await invalidateUserCaches(id)

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
    let updatedUser: User
    if (state === USER_STATE.banned) {
      updatedUser = await userService.banUser(user.id, { banDays })
    } else if (state !== user.state && user.state === USER_STATE.banned) {
      updatedUser = await userService.unbanUser(user.id, state)
    } else {
      updatedUser = await atomService.update({
        table: 'user',
        where: { id: user.id },
        data: {
          state,
        },
      })
    }
    await invalidateUserCaches(user.id)
    return updatedUser
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
    const user = (await atomService.userIdLoader.load(id)) as User
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
