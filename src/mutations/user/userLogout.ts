import { MutationToUserLogoutResolver } from 'definitions'
import { USER_ROLE } from 'common/enums'

const resolver: MutationToUserLogoutResolver = async (root, args, { res }) => {
  res.clearCookie('token')
  return true
}

export default resolver
