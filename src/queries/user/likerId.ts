import { environment } from 'common/environment'
import { UserToLikerIdResolver } from 'definitions'

const resolver: UserToLikerIdResolver = async (
  { likerId },
  _,
  { viewer, dataSources: { userService } }
) => {
  if (!likerId) {
    return null
  }

  const liker = await userService.findLiker({ likerId })

  // backdoor for "LikeCoin" OAuth Client to finish "Login with Matters" flow.
  const isFromLikeCoinOAuthClient =
    viewer.oauthClient &&
    viewer.oauthClient.name === environment.likecoinOAuthClientName

  if (liker && (isFromLikeCoinOAuthClient || liker.accountType === 'general')) {
    return likerId
  }

  return null
}

export default resolver
