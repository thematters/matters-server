import {
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_STATE,
  TRANSACTION_PURPOSE,
} from 'common/enums'

export interface PayoutAccount {
  id: string
  userId: string
  accountId: string
  provider: 'stripe'
  type: 'express' | 'standard'
  archived: boolean
  capabilitiesTransfers: boolean
  country: string
  currency: string
  createdAt: Date
  updatedAt: Date
}

export interface Transaction {
  id: string
  amount: string
  currency: PAYMENT_CURRENCY
  state: TRANSACTION_STATE
  purpose: TRANSACTION_PURPOSE
  provider: PAYMENT_PROVIDER
  providerTxId: string
  senderId: string | null
  recipientId: string
  targetId: string
  articleVersionId: string | null
  targetType: string
  fee: string
  remark: string
  parentId: string
  createdAt: Date
  updatedAt: Date
}

export interface BlockchainTransaction {
  id: string
  transactionId: string | null
  chainId: string
  txHash: `0x${string}`
  state: BLOCKCHAIN_TRANSACTION_STATE
  from: `0x${string}` | null
  to: `0x${string}` | null
  blockNumber: string
  createdAt: Date
  updatedAt: Date
}

export interface BlockchainSyncRecord {
  id: string
  chainId: string
  contractAddress: string
  blockNumber: string
  createdAt: Date
  updatedAt: Date
}

export interface Customer {
  id: string
  userId: string
  provider: string
  customerId: string
  cardLast4: string
  archived: boolean
}
