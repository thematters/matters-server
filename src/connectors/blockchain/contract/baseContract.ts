import { Contract, providers } from 'ethers'

import { getAlchemyProvider } from 'common/utils'

export class BaseContract {
  chainId: number
  address: string
  abi: string[]
  protected provider: providers.Provider
  protected contract: Contract
  constructor(chainId: number, address: string, abi: string[]) {
    this.chainId = chainId
    this.address = address
    this.abi = abi
    this.provider = getAlchemyProvider(chainId)
    this.contract = new Contract(address, abi, this.provider)
  }
}
