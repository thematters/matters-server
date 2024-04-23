import {
  CIRCLE_STATE,
  INVITATION_STATE,
  SUBSCRIPTION_STATE,
  PAYMENT_PROVIDER,
} from 'common/enums'

import { valueof } from './generic'
import { User } from './user'

export interface Circle {
  id: string
  name: string
  cover?: string
  avatar?: string
  state: CIRCLE_STATE
  owner: string
  displayName: string
  description?: string
  provider: string
  providerProductId: string
  createdAt: Date
  updatedAt: Date
}
export interface CirclePrice {
  id: string
  amount: string
  state: CIRCLE_STATE
  currency: 'HKD' | 'LIKE'
  circleId: string
  provider: PAYMENT_PROVIDER
  providerPriceId: string
  createdAt: Date
  updatedAt: Date
}

export interface CircleSubscription {
  id: string
  userId: string
  state: valueof<typeof SUBSCRIPTION_STATE>
  provider: string
  providerSubscriptionId: string
  canceledAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CircleSubscriptionItem {
  id: string
  userId: string
  subscriptionId
  priceId: string
  provider: 'stripe' | 'matters'
  providerSubscriptionItemId: string
  archived: bollean
  remark: string | null
  canceledAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CircleInvitation {
  id: string
  userId: string | null
  email: string | null
  inviter: string
  circleId: string
  sentAt: Date
  acceptedAt: Date | null
  durationInDays: number
  subscriptionItemId: string | null
  state: INVITATION_STATE
  createdAt: Date
}

export type CircleMember = User & { circleId: string }
