import { clearCookie } from 'common/utils/index.js'
import { MutationToUserLogoutResolver } from 'definitions'

const resolver: MutationToUserLogoutResolver = async (
  root,
  args,
  { req, res }
) => {
  clearCookie({ req, res })
  return true
}

export default resolver
