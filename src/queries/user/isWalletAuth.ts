import { UserInfoToIsWalletAuthResolver } from 'definitions'

const resolver: UserInfoToIsWalletAuthResolver = async (
  { id },
  _,
  { viewer }
) => {
  if (!viewer.id) {
    return false
  }

  return viewer.ethAddress && !viewer.passwordHash
}

export default resolver
