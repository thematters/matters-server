import type { GQLMutationResolvers } from 'definitions'

import { clearCookie } from 'common/utils'

const resolver: GQLMutationResolvers['userLogout'] = async (
  _,
  __,
  { req, res }
) => {
  clearCookie({ req, res })
  return true
}

export default resolver
