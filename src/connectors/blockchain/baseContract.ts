import {
  Address,
  PublicClient,
  createPublicClient,
  extractChain,
  http,
} from 'viem'
import * as chains from 'viem/chains'

import { BLOCKCHAIN_RPC } from 'common/enums'

export class BaseContract {
  public chainId: string
  public address: Address
  public blockNum: string

  protected client: PublicClient

  public constructor(chainId: string, address: Address, blockNum: string) {
    this.chainId = chainId
    this.address = address
    this.blockNum = blockNum

    const chain = extractChain({
      chains: Object.values(chains),
      id: chainId as any,
    }) as chains.Chain

    this.client = createPublicClient({
      chain,
      transport: http(BLOCKCHAIN_RPC[chainId]),
    })
  }

  public fetchBlockNumber = async (): Promise<bigint> =>
    this.client.getBlockNumber()
}
