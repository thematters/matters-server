import { MutationToUserLogoutResolver } from 'definitions'

const resolver: MutationToUserLogoutResolver = async (root, args, { res }) => {
  res.clearCookie('token')
  return true
}

export default resolver
