import { Resolver } from 'src/definitions'
import { ThirdPartyAccount } from 'src/definitions'

const resolver: Resolver = ({ thirdPartyAccounts }) =>
  thirdPartyAccounts.map(({ accountName }: ThirdPartyAccount) => accountName)

export default resolver
