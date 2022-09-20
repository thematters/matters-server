import { UserToIpnsAddressResolver } from 'definitions'

const resolver: UserToIpnsAddressResolver = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  const res = await atomService.findFirst({
    table: 'user_ipns_keys',
    where: { userId: id },
  })
  return res?.ipnsAddress
}

export default resolver
