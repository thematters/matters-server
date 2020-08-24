import { UserStatusToReceivedDonationCountResolver } from 'definitions'

const resolver: UserStatusToReceivedDonationCountResolver = (
  { id },
  _,
  { dataSources: { userService } }
) => userService.countReceivedDonation(id)

export default resolver
