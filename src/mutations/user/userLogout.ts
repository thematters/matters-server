import { MutationToUserLogoutResolver } from 'definitions'
import { clearCookie } from 'common/utils'

const resolver: MutationToUserLogoutResolver = async (root, args, { res }) => {
  clearCookie(res)
  return true
}

export default resolver
