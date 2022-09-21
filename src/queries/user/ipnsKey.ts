import { UserInfoToIpnsKeyResolver } from 'definitions'

const resolver: UserInfoToIpnsKeyResolver = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  const res = await atomService.findFirst({
    table: 'user_ipns_keys',
    where: { userId: id },
  })
  return res?.ipnsKey // ipnsAddress
}

export default resolver
