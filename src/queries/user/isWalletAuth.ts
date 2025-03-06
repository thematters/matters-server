import type { GQLUserInfoResolvers } from 'definitions/index.js'

const resolver: GQLUserInfoResolvers['isWalletAuth'] = async (
  { id },
  _,
  { viewer }
) => {
  if (!viewer.id) {
    return false
  }

  return !!viewer.ethAddress && !viewer.passwordHash
}

export default resolver
