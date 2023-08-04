import type { GQLLikerResolvers } from 'definitions'

import { environment } from 'common/environment'

const resolver: GQLLikerResolvers['likerId'] = async (
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
