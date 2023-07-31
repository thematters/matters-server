import type { GQLLikerResolvers } from 'definitions'

import { likecoin } from 'connectors'

const resolver: GQLLikerResolvers['civicLiker'] = async (
  { id },
  _: any,
  { dataSources: { userService } }
) => {
  const liker = await userService.findLiker({ userId: id })

  if (!liker) {
    return false
  }

  return likecoin.isCivicLiker({ likerId: liker.likerId, userId: id })
}

export default resolver
