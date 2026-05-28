import type { GQLMutationResolvers, User } from '#definitions/index.js'
import type { GlobalId } from '#definitions/nominal.js'

import { NODE_TYPES, USER_STATE } from '#common/enums/index.js'
import { UserInputError } from '#common/errors.js'
import { fromGlobalId, toGlobalId } from '#common/utils/index.js'

const MAX_ARCHIVE_USERS = 50

const resolver: GQLMutationResolvers['archiveUsers'] = async (
  _,
  { input: { ids, password } },
  {
    viewer,
    dataSources: {
      atomService,
      notificationService,
      userService,
      queues: { userQueue },
    },
  }
) => {
  const innerIds = Array.from(
    new Set(ids.map((id) => fromGlobalId(id).id).filter(Boolean))
  )

  if (innerIds.length === 0) {
    throw new UserInputError('at least one user id is required')
  }
  if (innerIds.length > MAX_ARCHIVE_USERS) {
    throw new UserInputError(
      `cannot archive more than ${MAX_ARCHIVE_USERS} users`
    )
  }
  if (!password || !viewer.id) {
    throw new UserInputError('`password` is required for archiving users')
  }

  await userService.verifyPassword({ password, hash: viewer.passwordHash })

  const archived: User[] = []
  const skipped: Array<{ id: GlobalId; message: string }> = []

  for (const id of innerIds) {
    const globalId = toGlobalId({ type: NODE_TYPES.User, id })

    try {
      const user = (await atomService.userIdLoader.load(id)) as User | null
      if (!user) {
        skipped.push({ id: globalId, message: 'user not found' })
        continue
      }
      if (user.state === USER_STATE.archived) {
        skipped.push({
          id: globalId,
          message: 'user has already been archived',
        })
        continue
      }

      const archivedUser = await userService.archive(id)
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

      archived.push(archivedUser)
    } catch (error) {
      skipped.push({
        id: globalId,
        message: error instanceof Error ? error.message : 'archive failed',
      })
    }
  }

  return { archived, skipped }
}

export default resolver
