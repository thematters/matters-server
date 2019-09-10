import { UserToLikerIdResolver } from 'definitions'

const resolver: UserToLikerIdResolver = async (
  { likerId },
  _,
  { dataSources: { userService } }
) => {
  if (!likerId) {
    return null
  }

  const liker = await userService.findLiker({ likerId })

  if (!liker || liker.accountType === 'temporal') {
    return null
  }

  return likerId
}

export default resolver
