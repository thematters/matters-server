import type { GQLOssResolvers, GlobalId } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { UserInputError } from '#common/errors.js'
import {
  connectionFromPromisedArray,
  fromConnectionArgs,
  fromGlobalId,
} from '#common/utils/index.js'

export const user: GQLOssResolvers['user'] = async (
  _,
  { input: { id, userName, email } },
  { dataSources: { atomService, userService } }
) => {
  const identifiers = [id, userName, email].filter(Boolean)
  if (identifiers.length !== 1) {
    throw new UserInputError(
      'exactly one of `id`, `userName`, or `email` is required'
    )
  }

  if (id) {
    const globalId = fromGlobalId(id as GlobalId)
    if (globalId.type !== NODE_TYPES.User) {
      throw new UserInputError('`id` must be a user ID')
    }
    return atomService.userIdLoader.load(globalId.id)
  }

  if (email) {
    return (await userService.findByEmail(email.toLowerCase())) ?? null
  }

  return (await userService.findByUserName(userName as string, true)) ?? null
}

export const users: GQLOssResolvers['users'] = async (
  _,
  { input },
  { dataSources: { userService } }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const totalCount = await userService.baseCount()

  return connectionFromPromisedArray(
    userService.baseFind({
      skip,
      take,
      orderBy: [{ column: 'id', order: 'desc' }],
    }),
    input,
    totalCount
  )
}
