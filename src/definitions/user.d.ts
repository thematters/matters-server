import { LANGUAGES } from './language'

export type User = UserNoUsername | UserHasUsername

interface UserBase {
  id: string
  uuid: string
  description: string
  avatar: string
  email: string | null
  emailVerified: boolean
  likerId?: string
  passwordHash: string
  paymentPointer?: string
  paymentPasswordHash?: string
  baseGravity: number
  currGravity: number
  language: LANGUAGES
  // oauthType: any
  role: UserRole
  state: UserState
  createdAt: string
  updatedAt: string
  agreeOn: string
  ethAddress: string
  currency?: 'HKD' | 'TWD' | 'USD'
  profileCover?: string
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

export type UserState = 'active' | 'banned' | 'archived'

export type Viewer = (User | { id: null }) & {
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

export type AuthMode = 'visitor' | 'oauth' | 'user' | 'admin'

export type UserOAuthLikeCoinAccountType = 'temporal' | 'general'

export interface UserOAuthLikeCoin {
  likerId: string
  accountType: UserOAuthLikeCoinAccountType
  accessToken: string
  refreshToken: string
  expires: Date
  scope: string | string[]
}

export interface OAuthClientDB {
  id: sring
  userId: string
  avatar: string
}

export interface OAuthClient {
  [key: string]: any
  id: string
  redirectUris?: string | string[]
  grants: string | string[]
  accessTokenLifetime?: number
  refreshTokenLifetime?: number
}

export interface OAuthAuthorizationCode {
  [key: string]: any
  authorizationCode: string
  expiresAt: Date
  redirectUri: string
  scope?: string | string[]
  client: OAuthClient
  user: User
}

export interface OAuthToken {
  [key: string]: any
  accessToken: string
  accessTokenExpiresAt?: Date
  refreshToken?: string
  refreshTokenExpiresAt?: Date
  scope?: string | string[]
  client: OAuthClient
  user: User
}

export interface OAuthRefreshToken {
  [key: string]: any
  refreshToken: string
  refreshTokenExpiresAt?: Date
  scope?: string | string[]
  client: OAuthClient
  user: User
}

export interface VerficationCode {
  id: string
  uuid: string
  expiredAt: Date
  code: string
  type: GQLVerificationCodeType
  status: VERIFICATION_CODE_STATUS
  email: string
}

export interface Wallet {
  id: string
  userId: string
  address: string
}
