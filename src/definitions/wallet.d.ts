import { GQLSigningMessagePurpose } from './schema'

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
