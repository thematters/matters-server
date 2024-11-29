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
} from 'viem'

import { BLOCKCHAIN_RPC, MINUTE } from 'common/enums'
import { isProd } from 'common/environment'
import { environment, contract } from 'common/environment'

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

export class CurationVaultContract {
  public address: Address
  public signer: SmartAccountSigner

  public constructor() {
    this.address = contract.Optimism.curationVaultAddress as `0x${string}`
    this.signer = LocalAccountSigner.privateKeyToAccountSigner(
      environment.curationVaultSignerPrivateKey as `0x${string}`
    )
  }

  public async getClient() {
    const rpcTransport = http(
      BLOCKCHAIN_RPC[isProd ? optimism.id : optimismSepolia.id]
    ) as HttpTransport

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
    if (!uid.startsWith('matters:')) {
      throw new Error('Invalid UID')
    }
    return uid.split(':')[1]
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
