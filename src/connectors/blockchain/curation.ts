import type { Address, Hash, Hex } from 'viem'

import { decodeEventLog, encodeEventTopics, parseAbiItem } from 'viem'

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
const erc20TokenCurationEventSignature =
  'event Curation(address indexed curator, address indexed creator, address indexed token, string uri, uint256 amount)' as const
const erc20TokenCurationEventABI = [
  {
    name: 'Curation',
    type: 'event',
    inputs: [
      { type: 'address', indexed: true, name: 'curator' },
      { type: 'address', indexed: true, name: 'creator' },
      { type: 'address', indexed: true, name: 'token' },
      { type: 'string', name: 'uri' },
      { type: 'uint256', name: 'amount' },
    ],
  },
] as const
type Erc20Params = { from: Hex; to: Hex; uri: string; amount: bigint }

// native token
const nativeTokenCurationEventSignature =
  'event Curation(address indexed from, address indexed to, string uri, uint256 amount)' as const
const nativeTokenCurationEventABI = [
  {
    name: 'Curation',
    type: 'event',
    inputs: [
      { type: 'address', indexed: true, name: 'from' },
      { type: 'address', indexed: true, name: 'to' },
      { type: 'string', name: 'uri' },
      { type: 'uint256', name: 'amount' },
    ],
  },
] as const
type NativeTokenParams = {
  curator: Hex
  creator: Hex
  token: Hex
  uri: string
  amount: bigint
}
// typeguards for viem
const isErc20TokenParams = (
  t: Erc20Params | NativeTokenParams
): t is Erc20Params => (t as Erc20Params).from !== undefined

// additional constants
const CURATION_ABI = [
  ...erc20TokenCurationEventABI,
  ...nativeTokenCurationEventABI,
] as const
const contractAddress =
  environment.polygonCurationContractAddress.toLowerCase() as Address

const chainId = isProd
  ? BLOCKCHAIN_CHAINID.Polygon.PolygonMainnet
  : BLOCKCHAIN_CHAINID.Polygon.PolygonMumbai

// CurationContract

export class CurationContract extends BaseContract {
  public erc20TokenCurationEventTopic: Hex[]
  public nativeTokenCurationEventTopic: Hex[]

  public constructor() {
    super(parseInt(chainId, 10), contractAddress, CURATION_ABI)
    // FIXME: this cast is weirdly required here; viem has this returned implicitly as this type
    //  but typescript inferred this as just Hex[] which is wrong. Viem should've explicitly type this
    // in `encodeEventTopics` but choose not to at the point of this
    this.erc20TokenCurationEventTopic = encodeEventTopics({
      abi: erc20TokenCurationEventABI,
      eventName: 'Curation',
    })
    this.nativeTokenCurationEventTopic = encodeEventTopics({
      abi: nativeTokenCurationEventABI,
      eventName: 'Curation',
    })
  }

  public fetchLogs = async (
    fromBlock: bigint,
    toBlock: bigint
  ): Promise<Array<Log<CurationEvent>>> => {
    const [erc20Logs, nativeLogs] = await Promise.all([
      this.client.getFilterLogs({
        filter: await this.client.createEventFilter({
          event: parseAbiItem(erc20TokenCurationEventSignature),
          fromBlock: BigInt(fromBlock),
          toBlock: BigInt(toBlock),
        }),
      }),
      this.client.getFilterLogs({
        filter: await this.client.createEventFilter({
          event: parseAbiItem(nativeTokenCurationEventSignature),
          fromBlock: BigInt(fromBlock),
          toBlock: BigInt(toBlock),
        }),
      }),
    ])

    // parse erc20logs and add result to logs
    const logs: Array<Log<CurationEvent>> = []
    ;[...erc20Logs, ...nativeLogs].forEach((log) => {
      const decodedLog = decodeEventLog({
        abi: CURATION_ABI,
        data: log.data,
        topics: log.topics as any,
      })

      // ERC20
      if ('curator' in decodedLog.args) {
        logs.push({
          event: {
            curatorAddress: decodedLog.args.curator.toLowerCase(),
            creatorAddress: decodedLog.args.creator.toLowerCase(),
            uri: decodedLog.args.uri,
            tokenAddress: decodedLog.args.token.toLowerCase(),
            amount: decodedLog.args.amount.toString(),
          },
          txHash: log.transactionHash,
          address: contractAddress,
          blockNumber: Number(log.blockNumber),
          removed: log.removed,
        })
      }
      // native
      else {
        logs.push({
          event: {
            curatorAddress: decodedLog.args.from.toLowerCase(),
            creatorAddress: decodedLog.args.to.toLowerCase(),
            uri: decodedLog.args.uri,
            tokenAddress: null,
            amount: decodedLog.args.amount.toString(),
          },
          txHash: log.transactionHash,
          address: contractAddress,
          blockNumber: Number(log.blockNumber),
          removed: log.removed,
        })
      }
    })

    return logs
  }

  public fetchTxReceipt = async (
    txHash: Hash
  ): Promise<CurationTxReceipt | null> => {
    const txReceipt = await this.client.getTransactionReceipt({ hash: txHash })
    if (!txReceipt) {
      return null
    }
    const targets = txReceipt.logs.filter(
      (log) =>
        log.address.toLowerCase() === this.address.toLowerCase() &&
        (log.topics[0] === this.erc20TokenCurationEventTopic[0] ||
          log.topics[0] === this.nativeTokenCurationEventTopic[0])
    )

    return {
      txHash,
      reverted: txReceipt.status === 'reverted',
      events: targets
        .map((log) =>
          decodeEventLog({
            abi: this.contract.abi as typeof CURATION_ABI,
            ...log,
          })
        )
        .map((e) => {
          const curatorAddress = (
            isErc20TokenParams(e.args) ? e.args.from : e.args.curator
          ).toLowerCase()
          const creatorAddress = (
            isErc20TokenParams(e.args) ? e.args.to : e.args.creator
          ).toLowerCase()
          const tokenAddress = !isErc20TokenParams(e.args)
            ? e.args?.token?.toLowerCase()
            : null
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
}
