import { Abi, PublicClient, getContract } from 'viem'

import { publicClient } from 'common/utils'

export class BaseContract {
  public chainId: number
  public address: string
  public abi: Abi
  protected client: PublicClient
  protected contract: ReturnType<typeof getContract>

  public constructor(chainId: number, address: `0x${string}`, abi: Abi) {
    this.chainId = chainId
    this.address = address
    this.abi = abi
    this.client = publicClient(chainId)
    this.contract = getContract({ abi, address, publicClient: this.client })
  }

  public fetchBlockNumber = async (): Promise<bigint> =>
    this.client.getBlockNumber()
}
