import { OfficialToIpfsAddressResolver } from 'definitions'

const resolver: OfficialToIpfsAddressResolver = async (
  root,
  input,
  { dataSources: { articleService } }
) => {
  const address = await articleService.ipfs.client.swarm.localAddrs()
  return address[0].toString()
}

export default resolver
