import {
  type PublicClient,
  type Transport,
  Address,
  createPublicClient,
  extractChain,
  http,
} from 'viem'

import { BLOCKCHAIN_RPC, BLOCKCHAIN_VIEM_CHAINS } from 'common/enums/index.js'

export class BaseContract {
  public chainId: string
  public address: Address
  public blockNum: string

  protected client: PublicClient<
    Transport,
    (typeof BLOCKCHAIN_VIEM_CHAINS)[number]
  >

  public constructor(chainId: string, address: Address, blockNum: string) {
    this.chainId = chainId
    this.address = address
    this.blockNum = blockNum

    const chain = extractChain({
      chains: BLOCKCHAIN_VIEM_CHAINS,
      id: chainId as any,
    })

    this.client = createPublicClient({
      chain: chain,
      transport: http(BLOCKCHAIN_RPC[chainId]),
    })
  }

  public fetchBlockNumber = async (): Promise<bigint> =>
    this.client.getBlockNumber()
}
