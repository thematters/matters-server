import {
  Abi,
  Address,
  PublicClient,
  createPublicClient,
  extractChain,
  getContract,
  http,
} from 'viem'
import * as chains from 'viem/chains'

import { rpcs } from 'common/utils'

export class BaseContract {
  public chainId: number
  public address: Address
  public abi: Abi

  protected client: PublicClient
  protected contract: ReturnType<typeof getContract>

  public constructor(chainId: number, address: Address, abi: Abi) {
    this.chainId = chainId
    this.address = address
    this.abi = abi

    const chain = extractChain({
      chains: Object.values(chains),
      id: chainId as any,
    }) as chains.Chain
    this.client = createPublicClient({
      chain,
      transport: http(rpcs[chainId]),
    })

    this.contract = getContract({ abi, address, publicClient: this.client })
  }

  public fetchBlockNumber = async (): Promise<bigint> =>
    this.client.getBlockNumber()
}
