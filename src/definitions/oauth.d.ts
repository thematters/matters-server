import { User } from './user'

export type UserOAuthLikeCoinAccountType = 'temporal' | 'general'

export interface OAuthClientDB {
  id: string
  userId: string | null
  avatar: string | null
  clientId: string
  redirectUri: string[]
  grantTypes: string[]
  scope: string[]
}

export interface UserOauthLikecoinDB {
  id: string
  likerId: string
  accountType: string
  accessToken: string
  refreshToken: string | null
  expires: Date
  scope: string[]
  pendingLike
  createdAt: Date
  updatedAt: Date
}

export interface OAuthAccessTokenDB {
  id: string
  token: string
  clientId: string
  userId: string
  scope: string[]
  expires: Date
  createdAt: Date
  updatedAt: Date
}

export interface OAuthRefreshTokenDB {
  id: string
  token: string
  clientId: string
  userId: string
  scope: string[] | null
  expires: Date
  createdAt: Date
  updatedAt: Date
}

export interface OAuthAuthorizationCodeDB {
  id: string
  code: string
  clientId: string
  userId: string
  scope: string[]
  expires: Date
  redirectUri: string
  createdAt: Date
  updatedAt: Date
}

export interface UserOAuthLikeCoin {
  likerId: string
  accountType: UserOAuthLikeCoinAccountType
  accessToken: string
  refreshToken: string
  expires: Date
  scope: string | string[]
}

export interface OAuthClient {
  id: string
  redirectUris?: string | string[]
  grants: string | string[]
  scope: string[]
  accessTokenLifetime?: number
  refreshTokenLifetime?: number
  rawClient: OAuthClientDB
}

export interface OAuthAuthorizationCode {
  authorizationCode: string
  expiresAt: Date
  redirectUri: string
  scope?: string | string[]
  client: OAuthClient
  user: User
}

export interface OAuthToken {
  accessToken: string
  accessTokenExpiresAt?: Date
  refreshToken?: string
  refreshTokenExpiresAt?: Date
  scope: string | string[]
  client: OAuthClient
  user: User
  id_token?: string
}

export interface OAuthRefreshToken {
  refreshToken: string
  refreshTokenExpiresAt?: Date
  scope?: string | string[]
  client: OAuthClient
  user: User
}
