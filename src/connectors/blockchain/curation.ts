import type { Address, Hash, Hex } from 'viem'

import { decodeEventLog, encodeEventTopics, parseAbiItem } from 'viem'

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
  from: Address
  to: Address | null
  blockNumber: number
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

// additional constants
const CURATION_ABI = [
  ...erc20TokenCurationEventABI,
  ...nativeTokenCurationEventABI,
] as const

export class CurationContract extends BaseContract {
  public erc20TokenCurationEventTopic: Hex[]
  public nativeTokenCurationEventTopic: Hex[]

  public constructor(chainId: number, contractAddress: string) {
    super(chainId, contractAddress as Address, CURATION_ABI)
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
      const { args: logArgs } = decodeEventLog({
        abi: CURATION_ABI,
        data: log.data,
        topics: log.topics as [signature: `0x${string}`, ...hex: Hex[]],
      })
      const baseLog = {
        txHash: log.transactionHash,
        address: this.address,
        blockNumber: Number(log.blockNumber),
        removed: log.removed,
      }

      // ERC20
      if ('curator' in logArgs) {
        logs.push({
          event: {
            curatorAddress: logArgs.curator.toLowerCase(),
            creatorAddress: logArgs.creator.toLowerCase(),
            uri: logArgs.uri,
            tokenAddress: logArgs.token.toLowerCase(),
            amount: logArgs.amount.toString(),
          },
          ...baseLog,
        })
      }
      // native
      else {
        logs.push({
          event: {
            curatorAddress: logArgs.from.toLowerCase(),
            creatorAddress: logArgs.to.toLowerCase(),
            uri: logArgs.uri,
            tokenAddress: null,
            amount: logArgs.amount.toString(),
          },
          ...baseLog,
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
      from: txReceipt.from,
      to: txReceipt.to,
      blockNumber: Number(txReceipt.blockNumber),
      events: targets
        .map((log) =>
          decodeEventLog({
            abi: CURATION_ABI,
            data: log.data,
            topics: log.topics as [signature: `0x${string}`, ...hex: Hex[]],
          })
        )
        .map((e) => {
          const log = e.args
          const isERC20 = 'curator' in log
          const curatorAddress = (
            isERC20 ? log.curator : log.from
          ).toLowerCase()
          const creatorAddress = (isERC20 ? log.creator : log.to).toLowerCase()
          const tokenAddress = isERC20 ? log.token.toLowerCase() : null

          return {
            curatorAddress,
            creatorAddress,
            uri: log?.uri,
            tokenAddress,
            amount: log?.amount?.toString(),
          }
        }),
    }
  }
}
