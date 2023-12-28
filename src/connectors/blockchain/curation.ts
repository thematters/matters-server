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
const erc20TokenCurationEventIdentifier = 'Curation' as const
const erc20TokenCurationEventSignature =
  'event Curation(address indexed curator, address indexed creator, address indexed token, string uri, uint256 amount)' as const
const erc20TokenCurationEventABI = [
  {
    name: erc20TokenCurationEventIdentifier,
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
const nativeTokenCurationEventIdentifier = 'Curation' as const
const nativeTokenCurationEventSignature =
  'event Curation(address indexed from, address indexed to, string uri, uint256 amount)' as const
const nativeTokenCurationEventABI = [
  {
    name: nativeTokenCurationEventIdentifier,
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
    // TODO: this cast is weirdly required here; viem has this returned implicitly as this type
    //  but typescript inferred this as just Hex[] which is wrong. Viem should've explicitly type this
    // in `encodeEventTopics` but choose not to at the point of this
    this.erc20TokenCurationEventTopic = encodeEventTopics({
      abi: erc20TokenCurationEventABI,
      eventName: erc20TokenCurationEventIdentifier,
    })
    this.nativeTokenCurationEventTopic = encodeEventTopics({
      abi: nativeTokenCurationEventABI,
      eventName: nativeTokenCurationEventIdentifier,
    }) as [signature: Hex]
  }

  public fetchLogs = async (
    fromBlock: bigint,
    toBlock: bigint
  ): Promise<Array<Log<CurationEvent>>> => {
    // has to refactor this out because otherwise viem would not type it correctly
    // const [erc20Logs, nativeLogs] =
    await Promise.all([
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
    const logs: Array<Log<CurationEvent>> = []

    // parse erc20logs and add result to logs
    // TODO: the args are not parsed correctly
    // const decodeErc20Logs = decodeEventLog({
    //   abi: erc20TokenCurationEventABI,
    //   topics: this.erc20TokenCurationEventTopic,
    // })

    return logs
    // const logs = erc20Logs.concat(nativeLogs)
    // return logs
    //   .map((e) => {
    //     const decodedLog = decodeEventLog({ abi: this.contract.abi, ...e })
    //     return {
    //       event: {
    //         curatorAddress: (decodedLog.args!.curator! || e.args!.from!).toLowerCase(),
    //         creatorAddress: (e.args!.creator! || e.args!.to!).toLowerCase(),
    //         uri: e.args!.uri,
    //         tokenAddress: e.args!.token! ? e.args!.token!.toLowerCase() : null,
    //         amount: e.args!.amount!.toString(),
    //       },
    //       txHash: e.transactionHash,
    //       address: contractAddress,
    //       blockNumber: e.blockNumber,
    //       removed: e.removed,
    //     }
    //   })
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
