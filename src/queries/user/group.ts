import type { GQLUserInfoResolvers } from 'definitions'

import { getUserGroup } from 'common/utils'

const resolver: GQLUserInfoResolvers['group'] = async (
  { id },
  _,
  { viewer }
) => {
  if (!viewer.group) {
    // re-get group in case viewer has no group
    return getUserGroup(viewer)
  }
  return viewer.group
}

export default resolver
