import type { Context, User } from '#definitions/index.js'

import { USER_FEATURE_FLAG_TYPE } from '#common/enums/index.js'

const defaultFeatures = {
  fediverseBeta: false,
  communityWatch: false,
}

const resolver = async (
  { id }: User,
  _: unknown,
  { viewer, dataSources: { userService } }: Context
) => {
  if (!id || id !== viewer.id) {
    return defaultFeatures
  }

  const flags = await userService.findFeatureFlags(id)
  const types = flags.map(({ type }) => type)

  return {
    fediverseBeta: types.includes(USER_FEATURE_FLAG_TYPE.fediverseBeta),
    communityWatch: types.includes(USER_FEATURE_FLAG_TYPE.communityWatch),
  }
}

export default resolver
