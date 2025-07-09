import type { GQLSigningMessagePurpose } from './schema.js'

// used in `codegen.json`, not db type
export interface Wallet {
  address: string
  id?: string
  userId?: string
}

export interface CryptoWallet {
  id: string
  userId: string | null
  address: string
  archived: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CryptoWalletSignature {
  id: string
  address: string
  signedMessage: string | null
  signature: string | null
  purpose: GQLSigningMessagePurpose
  userId: string | null
  nonce: string | null
  expiredAt: Date | null
  createdAt: Date
  updatedAt: Date
}
