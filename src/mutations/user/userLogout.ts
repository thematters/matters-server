import type { GQLMutationResolvers } from '#definitions/index.js'

import { clearCookie } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['userLogout'] = async (
  _,
  __,
  { req, res }
) => {
  clearCookie({ req, res })
  return true
}

export default resolver
