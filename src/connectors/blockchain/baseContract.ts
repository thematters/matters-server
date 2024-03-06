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

import { BLOCKCHAIN_RPC } from 'common/enums'

export class BaseContract {
  public chainId: string
  public address: Address
  public abi: Abi

  protected client: PublicClient
  protected contract: ReturnType<typeof getContract>

  public constructor(chainId: string, address: Address, abi: Abi) {
    this.chainId = chainId
    this.address = address
    this.abi = abi

    const chain = extractChain({
      chains: Object.values(chains),
      id: chainId as any,
    }) as chains.Chain

    this.client = createPublicClient({
      chain,
      transport: http(BLOCKCHAIN_RPC[chainId]),
    })

    this.contract = getContract({ abi, address, publicClient: this.client })
  }

  public fetchBlockNumber = async (): Promise<bigint> =>
    this.client.getBlockNumber()
}
