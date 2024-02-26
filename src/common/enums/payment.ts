import { optimism, optimismSepolia, polygon, polygonMumbai } from 'viem/chains'

import { environment, isProd } from 'common/environment'
import { GQLChain } from 'definitions'

import { LANGUAGE } from './language'

export enum TRANSACTION_STATE {
  pending = 'pending',
  succeeded = 'succeeded',
  failed = 'failed',
  canceled = 'canceled',
}

export enum TRANSACTION_PURPOSE {
  donation = 'donation',
  addCredit = 'add-credit',
  refund = 'refund',
  fee = 'fee',
  payout = 'payout',
  payoutReversal = 'payout-reversal',
  subscription = 'subscription',
  subscriptionSplit = 'subscription-split',
  dispute = 'dispute',
}

export enum TRANSACTION_TARGET_TYPE {
  article = 'article',
  transaction = 'transaction',
  circlePrice = 'circle_price',
}

export const PAYMENT_CURRENCY = {
  HKD: 'HKD',
  USD: 'USD',
  LIKE: 'LIKE',
  USDT: 'USDT',
} as const

export enum PAYMENT_PROVIDER {
  likecoin = 'likecoin',
  matters = 'matters',
  stripe = 'stripe',
  blockchain = 'blockchain',
}

export const BLOCKCHAIN: { [key in GQLChain]: GQLChain } = {
  Polygon: 'Polygon',
  Optimism: 'Optimism',
} as const

export const BLOCKCHAIN_CHAINNAME: { [chainId: string]: GQLChain } = {
  [polygon.id]: BLOCKCHAIN.Polygon,
  [polygonMumbai.id]: BLOCKCHAIN.Polygon,
  [optimism.id]: BLOCKCHAIN.Optimism,
  [optimismSepolia.id]: BLOCKCHAIN.Optimism,
} as const

export const BLOCKCHAIN_CHAINID = {
  [BLOCKCHAIN.Polygon]: isProd ? polygon.id + '' : polygonMumbai.id + '',
  [BLOCKCHAIN.Optimism]: isProd ? optimism.id + '' : optimismSepolia.id + '',
} as const

export const BLOCKCHAIN_RPC: { [chainId: string]: string } = {
  [polygon.id]: `https://polygon-mainnet.g.alchemy.com/v2/${environment.alchemyApiKey}`,
  [polygonMumbai.id]: `https://polygon-mumbai.g.alchemy.com/v2/${environment.alchemyApiKey}`,
  [optimism.id]: `https://opt-mainnet.g.alchemy.com/v2/${environment.alchemyApiKey}`,
  [optimismSepolia.id]: `https://opt-sepolia.g.alchemy.com/v2/${environment.alchemyApiKey}`,
}

// via https://support.kraken.com/hc/en-us/articles/203325283-Cryptocurrency-deposit-processing-times
export const BLOCKCHAIN_SAFE_CONFIRMS: { [key in GQLChain]: number } = {
  Polygon: 70,
  Optimism: 40,
} as const

export enum BLOCKCHAIN_TRANSACTION_STATE {
  pending = 'pending',
  succeeded = 'succeeded',
  reverted = 'reverted',
  canceled = 'canceled',
  timeout = 'timeout',
}

export const PAYMENT_MAX_DECIMAL_PLACES = 2

export enum PAYMENT_MINIMAL_ADD_CREDIT_AMOUNT {
  HKD = 20,
}

export enum PAYMENT_MAXIMUM_PAYTO_AMOUNT {
  HKD = 5000,
}

export enum PAYMENT_MINIMAL_PAYOUT_AMOUNT {
  HKD = 500,
}

export enum PAYMENT_MINIMAL_CIRCLE_AMOUNT {
  HKD = 20,
}

export enum PAYMENT_MAXIMUM_CIRCLE_AMOUNT {
  HKD = 5000,
}

export enum PAYMENT_STRIPE_PAYOUT_ACCOUNT_TYPE {
  express = 'express',
}

export enum SLACK_MESSAGE_STATE {
  canceled = 'canceled',
  failed = 'failed',
  successful = 'successful',
}

export enum TRANSACTION_REMARK {
  // LIKE & BLOCKCHAIN, used in lambda
  TIME_OUT = 'time_out',

  // BLOCKCHAIN
  INVALID = 'invalid',
}

export const TransactionRemarkText = {
  [LANGUAGE.zh_hant]: {
    amount_too_large: '金額高於最大允許金額',
    amount_too_small: '金額低於最小允許金額',
    card_decline_rate_limit_exceeded: '銀行卡被拒絕多次，請等待24小時',
    card_declined: '銀行卡被拒絕',
    expired_card: '銀行卡已過期',
    incorrect_address: '銀行卡地址錯誤',
    incorrect_cvc: '安全碼錯誤',
    invalid_cvc: '無效安全碼',
    incomplete_cvc: '無效安全碼',
    incorrect_number: '卡號錯誤',
    incorrect_zip: '郵編錯誤',
    incomplete_zip: '郵編錯誤',
    invalid_expiry_month: '銀行卡有效期錯誤',
    invalid_expiry_month_past: '銀行卡有效期錯誤',
    invalid_expiry_year: '銀行卡有效期錯誤',
    invalid_expiry_year_past: '銀行卡有效期錯誤',
    incomplete_expiry: '銀行卡有效期錯誤',
    invalid_number: '無效卡號',
    incomplete_number: '無效卡號',
    postal_code_invalid: '無效郵政編碼',
    processing_error: '操作失敗',
    rate_limit: '操作過於頻繁',

    // likecoin
    unknown_likecoin_failue: 'LIKE Pay 支付失敗',

    // fallback
    unknow_error: '未知支付錯誤',
  },

  [LANGUAGE.zh_hans]: {
    amount_too_large: '金额高于最大允许金额',
    amount_too_small: '金额低于最小允许金额',
    card_decline_rate_limit_exceeded: '银行卡被拒绝多次，请等待24小时',
    card_declined: '银行卡被拒绝',
    expired_card: '银行卡已过期',
    incorrect_address: '银行卡地址错误',
    incorrect_cvc: '安全码错误',
    invalid_cvc: '无效安全码',
    incomplete_cvc: '无效安全码',
    incorrect_number: '卡号错误',
    incorrect_zip: '邮编错误',
    incomplete_zip: '邮编错误',
    invalid_expiry_month: '银行卡有效期错误',
    invalid_expiry_month_past: '银行卡有效期错误',
    invalid_expiry_year: '银行卡有效期错误',
    invalid_expiry_year_past: '银行卡有效期错误',
    incomplete_expiry: '银行卡有效期错误',
    invalid_number: '无效卡号',
    incomplete_number: '无效卡号',
    postal_code_invalid: '无效邮政编码',
    processing_error: '操作失败',
    rate_limit: '操作过于频繁',

    // likecoin
    unknown_likecoin_failue: 'LIKE Pay 支付失败',

    // fallback
    unknow_error: '未知支付错误',
  },

  [LANGUAGE.en]: {
    amount_too_large: 'amount is larger than upper limit',
    amount_too_small: 'amount is less than lower limit',
    card_decline_rate_limit_exceeded:
      'card declined multiple times, please try again in 24 hours',
    card_declined: 'credit card declined',
    expired_card: 'credit card expired',
    incorrect_address: 'wrong billing address',
    incorrect_cvc: 'incorrect CVC code',
    invalid_cvc: 'invalid CVC code',
    incomplete_cvc: 'incomplete CVC code',
    incorrect_number: 'incorrect card number',
    incorrect_zip: 'incorrect zip code',
    incomplete_zip: 'incomplete zip code',
    invalid_expiry_month: 'invalid expiration month',
    invalid_expiry_month_past: 'invalid expiration month',
    invalid_expiry_year: 'invalid expiration year',
    invalid_expiry_year_past: 'invalid expiration year',
    incomplete_expiry: 'incomplete expiration month',
    invalid_number: 'invalid card number',
    incomplete_number: 'incomplete card number',
    postal_code_invalid: 'invalid post code',
    processing_error: 'process error',
    rate_limit: 'you have reached the rate limit',

    // likecoin
    unknown_likecoin_failue: 'LIKE Pay payment failed',

    // fallback
    unknow_error: 'unknown error',
  },
}

export enum METADATA_KEY {
  USER_ID = 'db_user_id',
  CUSTOMER_ID = 'db_customer_id',
  CIRCLE_ID = 'db_circle_id',
  CIRCLE_PRICE_ID = 'db_circle_price_id',
  TX_ID = 'db_tx_id',
}

export const COUNTRY_CODE = {
  Australia: 'AU',
  Austria: 'AT',
  Belgium: 'BE',
  Bulgaria: 'BG',
  Canada: 'CA',
  Cyprus: 'CY',
  Denmark: 'DK',
  Estonia: 'EE',
  Finland: 'FI',
  France: 'FR',
  Germany: 'DE',
  Greece: 'GR',
  HongKong: 'HK',
  Ireland: 'IE',
  Italy: 'IT',
  Latvia: 'LV',
  Lithuania: 'LT',
  Luxembourg: 'LU',
  Malta: 'MT',
  Netherlands: 'NL',
  NewZealand: 'NZ',
  Norway: 'NO',
  Poland: 'PL',
  Portugal: 'PT',
  Romania: 'RO',
  Singapore: 'SG',
  Slovakia: 'SK',
  Slovenia: 'SI',
  Spain: 'ES',
  Sweden: 'SE',
  UnitedKingdom: 'UK',
  UnitedStates: 'US',
}

export enum SUBSCRIPTION_ITEM_REMARK {
  trial_end = 'trial_end',
  trial_cancel = 'trial_cancel',
}

export enum INVITATION_STATE {
  pending = 'pending',
  accepted = 'accepted',
  transfer_succeeded = 'transfer_succeeded',
  transfer_failed = 'transfer_failed',
}
