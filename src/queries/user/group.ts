import { getUserGroup } from 'common/utils'
import { UserInfoToGroupResolver } from 'definitions'

const resolver: UserInfoToGroupResolver = async ({ id }, _, { viewer }) => {
  if (!viewer.group) {
    // re-get group in case viewer has no group
    return getUserGroup(viewer)
  }
  return viewer.group
}

export default resolver
