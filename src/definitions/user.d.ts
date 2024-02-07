import {
  SOCIAL_LOGIN_TYPE,
  USER_STATE,
  USER_RESTRICTION_TYPE,
} from 'common/enums'

import { LANGUAGES } from './language'

export type User = UserNoUsername | UserHasUsername

interface UserBase {
  id: string
  uuid: string
  description: string
  avatar: string
  email: string | null
  emailVerified: boolean
  likerId: string | null
  passwordHash: string | null
  paymentPointer: string | null
  paymentPasswordHash: string | null
  baseGravity: number
  currGravity: number
  language: LANGUAGES
  // oauthType: any
  role: UserRole
  state: UserState
  agreeOn: string
  ethAddress: string | null
  currency: 'HKD' | 'TWD' | 'USD' | null
  profileCover?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extra: any | null // jsonb saved here
  remark: string | null
  createdAt: Date
  updatedAt: Date
}

export type UserNoUsername = UserBase & { userName: null; displayName: null }
export type UserHasUsername = UserBase & {
  userName: string
  displayName: string
}

export interface EmailableUser {
  id: string
  displayName: string
  userName: string
  email: string
  language: LANGUAGES
}

export type UserRole = 'admin' | 'user'

export type UserState = keyof typeof USER_STATE

type ViewerBase = {
  id: undefined
  hasRole: (role: UserRole) => boolean
  hasAuthMode: (mode: string) => boolean
  ip?: string
  userAgent: string
  role: string
  language: LANGUAGES
  scope: { [key: string]: any }
  authMode: AuthMode
  oauthClient?: OAuthClient
  agentHash?: string
  token?: string
  group: 'a' | 'b'
}

export type Viewer = (User & ViewerBase) | ViewerBase

export type AuthMode = 'visitor' | 'oauth' | 'user' | 'admin'

export interface Wallet {
  id: string
  userId: string
  address: string
}

export interface SocialAccount {
  userId: string
  type: keyof typeof SOCIAL_LOGIN_TYPE
  providerAccountId: string
  userName?: string
  email?: string
}

export interface UserIpnsKeys {
  id: string
  userId: string | null
  ipnsKey: string
  privKeyPem: string
  privKeyName: string
  createdAt: Date
  updatedAt: Date
  lastDataHash: string | null
  lastPublished: Date | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stats: any
}

export interface UserNotifySetting {
  id: string
  userId: string
  enable: boolean
  mention: boolean
  userNewFollower: boolean
  articleNewComment: boolean
  articleNewAppreciation: boolean
  articleNewSubscription: boolean
  articleSubscribedNewComment: boolean
  articleCommentPinned: boolean
  reportFeedback: boolean
  email: boolean
  tag: boolean
  circleNewFollower: boolean
  circleNewDiscussion: boolean
  circleNewSubscriber: boolean
  circleNewUnsubscriber: boolean
  circleMemberBroadcast: boolean
  circleMemberNewDiscussion: boolean
  circleMemberNewDiscussionReply: boolean
  inCircleNewArticle: boolean
  inCircleNewBroadcast: boolean
  inCircleNewBroadcastReply: boolean
  inCircleNewDiscussion: boolean
  inCircleNewDiscussionReply: boolean
  articleNewCollected: boolean
  circleMemberNewBroadcastReply: boolean
  createdAt: Date
  updatedAt: Date
}

export interface UsernameEditHistory {
  id: string
  userId: string
  previous: string
  createdAt: Date
}

export interface UserRestriction {
  id: string
  userId: string
  type: keyof typeof USER_RESTRICTION_TYPE
  createdAt: Date
}

export interface UserBoost {
  id: string
  userId: string
  boost: number
  createdAt: Date
  updatedAt: Date
}

export interface SeedingUser {
  id: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

export interface UserBadge {
  id: string
  userId: string
  type: string
  enabled: boolean
  extra: any
  createdAt: Date
}
