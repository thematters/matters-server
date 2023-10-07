import { PublicClient, getContract } from 'viem'

import { getAlchemyClient } from 'common/utils'

export class BaseContract {
  public chainId: number
  public address: string
  public abi: string[]
  protected provider: PublicClient
  protected contract: ReturnType<typeof getContract>
  public constructor(chainId: number, address: `0x${string}`, abi: string[]) {
    this.chainId = chainId
    this.address = address
    this.abi = abi
    this.provider = getAlchemyClient(chainId)
    this.contract = getContract({ abi, address, publicClient: this.provider })
  }

  public fetchBlockNumber = async (): Promise<bigint> => this.provider.getBlockNumber()
}
