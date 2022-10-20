import { BLOCKCHAIN_CHAINID } from 'common/enums'
import { environment, isProd } from 'common/environment'

import { BaseContract } from './baseContract'

// type
//
export interface Log<T> {
  event: T
  txHash: string
  address: string
  blockNumber: number
  removed: boolean
}

export interface CurationEvent {
  curatorAddress: string
  creatorAddress: string
  uri: string
  tokenAddress: string
  amount: string
}

// constants

const abi = [
  'event Curation(address indexed curator, address indexed creator, address indexed token, string uri, uint256 amount)',
]
const contractAddress = environment.curationContractAddress.toLowerCase()

const chainId = isProd
  ? BLOCKCHAIN_CHAINID.Polygon.PolygonMainnet
  : BLOCKCHAIN_CHAINID.Polygon.PolygonMumbai

export class CurationContract extends BaseContract {
  eventTopic: string

  constructor() {
    super(parseInt(chainId, 10), contractAddress, abi)
    this.eventTopic =
      '0xc2e41b3d49bbccbac6ceb142bad6119608adf4f1ee1ca5cc6fc332e0ca2fc602'
  }

  fetchLogs = async (
    fromBlock?: number,
    toBlock?: number
  ): Promise<Array<Log<CurationEvent>>> => {
    const logs = await this.contract.queryFilter(
      this.contract.filters.Curation(),
      fromBlock,
      toBlock
    )
    return logs.map((e) => ({
      event: {
        curatorAddress: e.args!.curator!.toLowerCase(),
        creatorAddress: e.args!.creator!.toLowerCase(),
        uri: e.args!.uri,
        tokenAddress: e.args!.token!.toLowerCase(),
        amount: e.args!.amount!.toString(),
      },
      txHash: e.transactionHash,
      address: contractAddress,
      blockNumber: e.blockNumber,
      removed: e.removed,
    }))
  }
}
