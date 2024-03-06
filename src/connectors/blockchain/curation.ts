// import type { Log as EthersLog } from '@ethersproject/abstract-provider'
import { Contract } from 'ethers'
import { Log as EthersLog, decodeEventLog } from 'viem'

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

const erc20TokenCurationEventABI =
  'event Curation(address indexed curator, address indexed creator, address indexed token, string uri, uint256 amount)'
const erc20TokenCurationEventIdentifier =
  'Curation(address,address,address,string,uint256)'
const nativeTokenCurationEventABI =
  'event Curation(address indexed from, address indexed to, string uri, uint256 amount)'
const nativeTokenCurationEventIdentifier =
  'Curation(address,address,string,uint256)'
const contractAddress = environment.polygonCurationContractAddress.toLowerCase()

const chainId = isProd
  ? BLOCKCHAIN_CHAINID.Polygon.PolygonMainnet
  : BLOCKCHAIN_CHAINID.Polygon.PolygonMumbai

// CurationContract

export class CurationContract extends BaseContract {
  public erc20TokenCurationEventTopic: string
  public nativeTokenCurationEventTopic: string

  public constructor() {
    super(parseInt(chainId, 10), contractAddress, [
      erc20TokenCurationEventABI,
      nativeTokenCurationEventABI,
    ])
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
    txHash: string
  ): Promise<CurationTxReceipt | null> => {
    const txReceipt = await this.provider.getTransactionReceipt(txHash)
    if (!txReceipt) {
      return null
    }
    const targets = txReceipt.logs.filter(
      (log: EthersLog) =>
        log.address.toLowerCase() === this.address.toLowerCase() &&
        (log.topics[0] === this.erc20TokenCurationEventTopic ||
          log.topics[0] === this.nativeTokenCurationEventTopic)
    )
    const iface = this.contract.interface as unknown as Contract["interface"]
    return {
      txHash,
      reverted: txReceipt.status === 0,
      events: targets
        // .map(log => iface.parseLog(log))
        .map((log) => decodeEventLog(log))
        .map((e) => ({
          curatorAddress: (e.args!.curator! || e.args!.from!).toLowerCase(),
          creatorAddress: (e.args!.creator! || e.args!.to!).toLowerCase(),
          uri: e.args!.uri,
          tokenAddress: e.args!.token! ? e.args!.token!.toLowerCase() : null,
          amount: e.args!.amount!.toString(),
        })),
    }
  }

  private _fetchLogs = async (
    fromBlock: number,
    toBlock: number,
    filter: any
  ) => this.contract.queryFilter(filter, fromBlock, toBlock)
}
