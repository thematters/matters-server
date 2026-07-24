import type {
  GQLModerationCaseConnection,
  GQLUserOssResolvers,
  ModerationCase,
} from '#definitions/index.js'

import {
  connectionFromPromisedArray,
  fromConnectionArgs,
} from '#common/utils/index.js'

export const ossEmail: GQLUserOssResolvers['email'] = ({
  email: accountEmail,
}) => (accountEmail ? accountEmail.replace(/#/g, '@') : null)

export const ossEmailVerified: GQLUserOssResolvers['emailVerified'] = ({
  emailVerified: accountEmailVerified,
}) => accountEmailVerified || false

export const boost: GQLUserOssResolvers['boost'] = (
  { id },
  _,
  { dataSources: { userService } }
) => userService.findBoost(id)

export const score: GQLUserOssResolvers['score'] = (
  { id },
  _,
  { dataSources: { userService } }
) => userService.findScore(id)

export const restrictions: GQLUserOssResolvers['restrictions'] = (
  { id },
  _,
  { dataSources: { userService } }
) => userService.findRestrictions(id)

export const featureFlags: GQLUserOssResolvers['featureFlags'] = (
  { id },
  _,
  { dataSources: { userService } }
) => userService.findFeatureFlags(id)

export const momentFeedApplication: GQLUserOssResolvers['momentFeedApplication'] =
  ({ id }, _, { dataSources: { atomService } }) =>
    atomService.findFirst({
      table: 'moment_feed_user',
      where: { userId: id },
    })

export const moderationCases: GQLUserOssResolvers['moderationCases'] = async (
  { id },
  { input },
  { dataSources: { systemService } }
) => {
  const { take, skip } = fromConnectionArgs(input)
  const where = {
    targetType: 'user',
    targetId: id,
  }
  const totalCount = await systemService.baseCount(where, 'moderation_case')

  return (await connectionFromPromisedArray(
    systemService.baseFind({
      table: 'moderation_case',
      where,
      orderBy: [{ column: 'createdAt', order: 'desc' }],
      skip,
      take,
    }) as Promise<ModerationCase[]>,
    input,
    totalCount
  )) as unknown as GQLModerationCaseConnection
}
