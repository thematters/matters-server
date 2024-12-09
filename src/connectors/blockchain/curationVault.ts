import { createMultiOwnerModularAccount } from '@alchemy/aa-accounts'
import {
  LocalAccountSigner,
  optimismSepolia,
  HttpTransport,
  optimism,
  createSmartAccountClient,
  SmartAccountSigner,
} from '@alchemy/aa-core'
import {
  Address,
  encodeFunctionData,
  encodePacked,
  parseSignature,
  keccak256,
  http,
  Hex,
  encodeEventTopics,
  parseAbiItem,
  decodeEventLog,
  Hash,
} from 'viem'

import {
  BLOCKCHAIN,
  BLOCKCHAIN_CHAINID,
  BLOCKCHAIN_RPC,
  MINUTE,
} from 'common/enums'
import { isProd } from 'common/environment'
import { environment, contract } from 'common/environment'

import { BaseContract } from './baseContract'

// type
export interface CurationVaultEvent {
  curatorAddress: string
  creatorId: string | null
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

export interface CurationVaultTxReceipt {
  events: CurationVaultEvent[]
  txHash: string
  reverted: boolean
  from: Address
  to: Address | null
  blockNumber: number
}

// constants
const CURATION_VAULT_ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'string',
        name: 'uid',
        type: 'string',
      },
      {
        indexed: true,
        internalType: 'contract IERC20',
        name: 'token',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'uri',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'Curation',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'erc20Balances',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'to_',
        type: 'address',
      },
      {
        internalType: 'string',
        name: 'uid_',
        type: 'string',
      },
      {
        internalType: 'contract IERC20',
        name: 'token_',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'expiredAt_',
        type: 'uint256',
      },
      {
        internalType: 'uint8',
        name: 'v_',
        type: 'uint8',
      },
      {
        internalType: 'bytes32',
        name: 'r_',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 's_',
        type: 'bytes32',
      },
    ],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

const erc20TokenCurationEventSignature =
  'event Curation(address indexed curator, string uid, address indexed token, string uri, uint256 amount)' as const
const erc20TokenCurationEventABI = [
  {
    name: 'Curation',
    type: 'event',
    inputs: [
      { type: 'address', indexed: true, name: 'curator' },
      { type: 'string', indexed: false, name: 'uid' },
      { type: 'address', indexed: true, name: 'token' },
      { type: 'string', name: 'uri' },
      { type: 'uint256', name: 'amount' },
    ],
  },
] as const
const nativeTokenCurationEventSignature =
  'event Curation(address indexed from, string uid, string uri, uint256 amount)' as const
const nativeTokenCurationEventABI = [
  {
    name: 'Curation',
    type: 'event',
    inputs: [
      { type: 'address', indexed: true, name: 'from' },
      { type: 'string', indexed: false, name: 'uid' },
      { type: 'string', name: 'uri' },
      { type: 'uint256', name: 'amount' },
    ],
  },
] as const

const CURATION_EVENT_ABI = [
  ...erc20TokenCurationEventABI,
  ...nativeTokenCurationEventABI,
] as const

export class CurationVaultContract extends BaseContract {
  public signer: SmartAccountSigner

  public erc20TokenCurationEventTopic: Hex[]
  public nativeTokenCurationEventTopic: Hex[]

  public constructor() {
    // support OP only
    const chainId = BLOCKCHAIN_CHAINID[BLOCKCHAIN.Optimism]
    const contractAddress = contract.Optimism.curationVaultAddress as Address

    super(chainId, contractAddress, contract.Optimism.curationVaultBlockNum)

    this.signer = LocalAccountSigner.privateKeyToAccountSigner(
      environment.curationVaultSignerPrivateKey as `0x${string}`
    )
    this.erc20TokenCurationEventTopic = encodeEventTopics({
      abi: erc20TokenCurationEventABI,
      eventName: 'Curation',
    }) as Hex[]
    this.nativeTokenCurationEventTopic = encodeEventTopics({
      abi: nativeTokenCurationEventABI,
      eventName: 'Curation',
    }) as Hex[]
  }

  public fetchLogs = async (
    fromBlock: bigint,
    toBlock: bigint
  ): Promise<Array<Log<CurationVaultEvent>>> => {
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
    const logs: Array<Log<CurationVaultEvent>> = []
    ;[...erc20Logs, ...nativeLogs].forEach((log) => {
      const { args: logArgs } = decodeEventLog({
        abi: CURATION_EVENT_ABI,
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
            creatorId: this.parseUID(logArgs.uid),
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
            creatorId: this.parseUID(logArgs.uid),
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
  ): Promise<CurationVaultTxReceipt | null> => {
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
            abi: CURATION_EVENT_ABI,
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
          const tokenAddress = isERC20 ? log.token.toLowerCase() : null
          const uid = this.parseUID(log.uid)

          return {
            curatorAddress,
            creatorId: uid,
            uri: log?.uri,
            tokenAddress,
            amount: log?.amount?.toString(),
          }
        }),
    }
  }

  public async getClient() {
    const rpcTransport = http(BLOCKCHAIN_RPC[this.chainId]) as HttpTransport

    return createSmartAccountClient({
      transport: rpcTransport,
      chain: isProd ? optimism : optimismSepolia,
      account: await createMultiOwnerModularAccount({
        transport: rpcTransport,
        chain: isProd ? optimism : optimismSepolia,
        signer: this.signer,
      }),
    })
  }

  public toUID(userId: string) {
    return `matters:${userId}`
  }

  public parseUID(uid: string) {
    const match = uid.match(/^matters:(\d+)$/)
    if (!match) {
      return null
    }
    return match[1]
  }

  public async getWithdrawableUSDTAmount(userId: string) {
    const client = await this.getClient()
    const uid = this.toUID(userId)
    return client.readContract({
      address: this.address,
      abi: CURATION_VAULT_ABI,
      functionName: 'erc20Balances',
      args: [uid, contract.Optimism.tokenAddress as `0x${string}`],
    })
  }

  public async withdraw(userId: string) {
    const client = await this.getClient()
    const uid = this.toUID(userId)
    const expiry = BigInt(Math.floor(Date.now() / 1000) + MINUTE * 3) // 3 mins
    const signerAddress = await this.signer.getAddress()
    const hash = keccak256(
      encodePacked(
        ['address', 'string', 'uint256', 'address'],
        [signerAddress, uid, expiry, this.address]
      )
    )
    const signature = await this.signer.signMessage({ raw: hash })
    const { v, r, s } = parseSignature(signature)

    return client.sendUserOperation({
      uo: {
        target: this.address,
        data: encodeFunctionData({
          abi: CURATION_VAULT_ABI,
          functionName: 'withdraw',
          args: [
            signerAddress,
            uid,
            contract.Optimism.tokenAddress as `0x${string}`,
            expiry,
            Number(v),
            r,
            s,
          ],
        }),
      },
    })
  }
}
