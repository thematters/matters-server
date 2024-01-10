import { Abi, PublicClient, createPublicClient, getContract, http } from 'viem'
import { polygon, polygonMumbai } from 'viem/chains'

import { BLOCKCHAIN, BLOCKCHAIN_CHAINID } from 'common/enums'
import { rpcs } from 'common/utils'

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

    const isMainnetPolygon =
      chainId.toString() ===
      BLOCKCHAIN_CHAINID[BLOCKCHAIN.Polygon].PolygonMainnet
    this.client = createPublicClient({
      chain: isMainnetPolygon ? polygon : polygonMumbai,
      transport: http(rpcs[chainId]),
    })

    this.contract = getContract({ abi, address, publicClient: this.client })
  }

  public fetchBlockNumber = async (): Promise<bigint> =>
    this.client.getBlockNumber()
}
