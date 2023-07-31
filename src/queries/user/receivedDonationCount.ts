import type { GQLUserStatusResolvers } from 'definitions'

const resolver: GQLUserStatusResolvers['receivedDonationCount'] = (
  { id },
  _,
  { dataSources: { userService } }
) => userService.countReceivedDonation(id)

export default resolver
