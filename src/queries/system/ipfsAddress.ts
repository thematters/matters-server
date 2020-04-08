import { OfficialToIpfsAddressResolver } from 'definitions'

const resolver: OfficialToIpfsAddressResolver = async (
  root,
  input,
  { dataSources: { articleService } }
) => {
  const addresses = await articleService.ipfs.client.swarm.localAddrs()
  return addresses.map((addres) => addres.toString())
}

export default resolver
