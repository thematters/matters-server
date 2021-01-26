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
  subscription = 'subscription',
  subscriptionSplit = 'subscription-split',
}

export enum TRANSACTION_TARGET_TYPE {
  article = 'article',
  transaction = 'transaction',
  circlePrice = 'circle_price',
}

export enum PAYMENT_CURRENCY {
  HKD = 'HKD',
  LIKE = 'LIKE',
}

export enum PAYMENT_PROVIDER {
  likecoin = 'likecoin',
  matters = 'matters',
  stripe = 'stripe',
}

export const PAYMENT_MAXIMUM_AMOUNT = {
  HKD: 5000,
}

export enum PAYMENT_PAYOUT_MINIMUM_AMOUNT {
  HKD = 500,
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
  // LIKE
  TIME_OUT = 'time_out',

  // STRIPE
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
}
