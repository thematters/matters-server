import { Contract } from 'ethers'
import { Address, decodeEventLog } from 'viem'

import { BLOCKCHAIN_CHAINID } from 'common/enums'
import { environment, isProd } from 'common/environment'

import { BaseContract } from './baseContract'

// type

export interface CurationEvent {
  curatorAddress: string
  creatorAddress: string
  uri: string
  tokenAddress: string | null
  amount: string
}

export interface Log<T> {
  event: T
  txHash: string
  address: string
  blockNumber: number
  removed: boolean
}

export interface CurationTxReceipt {
  events: CurationEvent[]
  txHash: string
  reverted: boolean
}

// constants
// erc20 token
const erc20TokenCurationEventIdentifier =
  'Curation(address,address,address,string,uint256)'
const erc20TokenCurationEventABI = [{
  name: erc20TokenCurationEventIdentifier,
  type: 'event',
  inputs: [
    { type: 'address', indexed: true, name: 'curator' },
    { type: 'address', indexed: true, name: 'creator' },
    { type: 'address', indexed: true, name: 'token' },
    { type: 'string', name: 'uri' },
    { type: 'uint256', name: 'amount' }
  ]
}] as const
type Erc20Params = { from: `0x${string}`; to: `0x${string}`; uri: string; amount: bigint; }
// native token
const nativeTokenCurationEventIdentifier =
  'Curation(address,address,string,uint256)'
const nativeTokenCurationEventABI = [{
  name: nativeTokenCurationEventIdentifier,
  type: 'event',
  inputs: [
    { type: 'address', indexed: true, name: 'from' },
    { type: 'address', indexed: true, name: 'to' },
    { type: 'string', name: 'uri' },
    { type: 'uint256', name: 'amount' }
  ]
}] as const
type NativeTokenParams = { curator: `0x${string}`; creator: `0x${string}`; token: `0x${string}`; uri: string; amount: bigint; }
// typeguards for viem
const isErc20TokenParams = (t: Erc20Params | NativeTokenParams): t is Erc20Params => (t as Erc20Params).from !== undefined

// additional constants
const CURATION_ABI = [...erc20TokenCurationEventABI, ...nativeTokenCurationEventABI] as const
const contractAddress = environment.polygonCurationContractAddress.toLowerCase() as Address

const chainId = isProd
  ? BLOCKCHAIN_CHAINID.Polygon.PolygonMainnet
  : BLOCKCHAIN_CHAINID.Polygon.PolygonMumbai

// CurationContract

export class CurationContract extends BaseContract {
  public erc20TokenCurationEventTopic: string
  public nativeTokenCurationEventTopic: string

  public constructor() {
    super(parseInt(chainId, 10), contractAddress, CURATION_ABI)
    this.erc20TokenCurationEventTopic = this.contract.interface.getEventTopic(
      erc20TokenCurationEventIdentifier
    )
    this.nativeTokenCurationEventTopic = this.contract.interface.getEventTopic(
      nativeTokenCurationEventIdentifier
    )
  }

  public fetchLogs = async (
    fromBlock: number,
    toBlock: number
  ): Promise<Array<Log<CurationEvent>>> => {
    const [erc20Logs, nativeLogs] = await Promise.all([
      this._fetchLogs(
        fromBlock,
        toBlock,
        (this.contract as unknown as Contract).filters[erc20TokenCurationEventIdentifier]()
      ),
      this._fetchLogs(
        fromBlock,
        toBlock,
        this.contract.filters[nativeTokenCurationEventIdentifier]()
      ),
    ])
    const logs = erc20Logs.concat(nativeLogs)
    return logs.map((e) => ({
      event: {
        curatorAddress: (e.args!.curator! || e.args!.from!).toLowerCase(),
        creatorAddress: (e.args!.creator! || e.args!.to!).toLowerCase(),
        uri: e.args!.uri,
        tokenAddress: e.args!.token! ? e.args!.token!.toLowerCase() : null,
        amount: e.args!.amount!.toString(),
      },
      txHash: e.transactionHash,
      address: contractAddress,
      blockNumber: e.blockNumber,
      removed: e.removed,
    }))
  }

  public fetchTxReceipt = async (
    txHash: `0x{string}`
  ): Promise<CurationTxReceipt | null> => {
    const txReceipt = await this.client.getTransactionReceipt({ hash: txHash })
    if (!txReceipt) {
      return null
    }
    const targets = txReceipt.logs.filter(log =>
      log.address.toLowerCase() === this.address.toLowerCase() &&
      (log.topics[0] === this.erc20TokenCurationEventTopic ||
        log.topics[0] === this.nativeTokenCurationEventTopic)
    )

    return {
      txHash,
      reverted: txReceipt.status === 'reverted',
      events: targets
        .map((log) => decodeEventLog({ abi: this.contract.abi as typeof CURATION_ABI, ...log }))
        .map((e) => {
          const curatorAddress = (isErc20TokenParams(e.args) ? e.args.from : e.args.curator).toLowerCase()
          const creatorAddress = (isErc20TokenParams(e.args) ? e.args.to : e.args.creator).toLowerCase()
          const tokenAddress = !isErc20TokenParams(e.args) ? e.args?.token?.toLowerCase() : null
          return {
            curatorAddress,
            creatorAddress,
            uri: e.args?.uri,
            tokenAddress,
            amount: e.args?.amount?.toString(),
          }
        }),
    }
  }

  private _fetchLogs = async (
    fromBlock: number,
    toBlock: number,
    filter: any
  ) => this.contract.queryFilter(filter, fromBlock, toBlock)
}
