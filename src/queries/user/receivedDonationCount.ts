import type { GQLUserStatusResolvers } from 'definitions'

const resolver: GQLUserStatusResolvers['receivedDonationCount'] = (
  { id },
  _,
  { dataSources: { userService } }
) => {
  if (id === null) {
    return 0
  }
  return userService.countReceivedDonation(id)
}

export default resolver
