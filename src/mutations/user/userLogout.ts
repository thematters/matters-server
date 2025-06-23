import type { GQLMutationResolvers } from '#definitions/index.js'

import { REFRESH_TOKEN_REVOKE_REASON } from '#common/enums/index.js'

const resolver: GQLMutationResolvers['userLogout'] = async (
  _,
  __,
  { req, res, dataSources: { userService } }
) => {
  await userService.logout({
    req,
    res,
    reason: REFRESH_TOKEN_REVOKE_REASON.userLogout,
  })

  return true
}

export default resolver
