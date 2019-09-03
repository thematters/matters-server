import { Response } from 'express'
import { DataSource } from 'apollo-datasource'

import {
  UserService,
  ArticleService,
  CommentService,
  DraftService,
  SystemService,
  TagService,
  NotificationService
} from 'connectors'
import { LANGUAGE } from 'common/enums'

export * from './schema'
export * from './notification'

export type NodeTypes = 'Article' | 'User' | 'Comment' | 'Draft' | 'Tag'

export type User = {
  id: string
  uuid: string
  userName: string
  displayName: string
  description: string
  avatar: string
  email: string
  mobile: string | null
  passwordHash: string
  readSpead: number
  baseGravity: number
  currGravity: number
  language: LANGUAGES
  // oauthType: any
  role: 'admin' | 'user'
  state: string
  createdAt: string
  updatedAt: string
  agreeOn: string
}

export type Context = RequestContext & {
  dataSources: DataSources
}

export type Viewer = (User | { id: null }) & {
  hasRole: (role: string) => boolean
  hasScopeMode: (mode: string) => boolean
  ip?: string
  role: string
  language: LANGUAGES
  scope: { [key: string]: any }
  scopeMode: 'visitor' | 'oauth' | 'user' | 'admin'
}

export type RequestContext = {
  viewer: Viewer
  res: Response
}

export type DataSources = {
  articleService: InstanceType<typeof ArticleService>
  commentService: InstanceType<typeof CommentService>
  draftService: InstanceType<typeof DraftService>
  userService: InstanceType<typeof UserService>
  systemService: InstanceType<typeof SystemService>
  tagService: InstanceType<typeof TagService>
  notificationService: InstanceType<typeof NotificationService>
}

export type TableName =
  | 'action'
  | 'article_boost'
  | 'action_user'
  | 'action_comment'
  | 'action_article'
  | 'transaction'
  | 'asset'
  | 'article'
  | 'article_read'
  | 'article_tag'
  | 'audio_draft'
  | 'comment'
  | 'collection'
  | 'draft'
  | 'noop'
  | 'user'
  | 'user_oauth'
  | 'user_notify_setting'
  | 'username_edit_history'
  | 'notice_detail'
  | 'notice'
  | 'notice_actor'
  | 'notice_entity'
  | 'push_device'
  | 'report'
  | 'report_asset'
  | 'feedback'
  | 'feedback_asset'
  | 'invitation'
  | 'verification_code'
  | 'search_history'
  | 'tag'
  | 'tag_boost'
  | 'user_boost'
  | 'matters_today'
  | 'matters_choice'
  | 'article_recommend_setting'
  | 'log_record'
  | 'oauth_client'
  | 'oauth_access_token'
  | 'oauth_authorization_code'
  | 'oauth_refresh_token'
  | 'user_oauth_likecoin'

export type MaterializedView =
  | 'article_count_materialized'
  | 'tag_count_materialized'
  | 'user_reader_materialized'
  | 'article_activity_materialized'

export type ThirdPartyAccount = {
  accountName: 'facebook' | 'wechat' | 'google'
  baseUrl: string
  token: string
}

export interface BatchParams {
  input: {
    [key: string]: any
  }
}

export type S3Bucket =
  | 'matters-server-dev'
  | 'matters-server-stage'
  | 'matters-server-production'

export type Item = { id: string; [key: string]: any }

export type ItemData = { [key: string]: any }

export type LANGUAGES = keyof typeof LANGUAGE

export type ResponseType = 'Article' | 'Comment'

export interface OAuthClient {
  id: string
  redirectUris?: string | string[]
  grants: string | string[]
  accessTokenLifetime?: number
  refreshTokenLifetime?: number
  [key: string]: any
}

export interface OAuthAuthorizationCode {
  authorizationCode: string
  expiresAt: Date
  redirectUri: string
  scope?: string | string[]
  client: OAuthClient
  user: User
  [key: string]: any
}

export interface OAuthToken {
  accessToken: string
  accessTokenExpiresAt?: Date
  refreshToken?: string
  refreshTokenExpiresAt?: Date
  scope?: string | string[]
  client: OAuthClient
  user: User
  [key: string]: any
}

export interface OAuthRefreshToken {
  refreshToken: string
  refreshTokenExpiresAt?: Date
  scope?: string | string[]
  client: OAuthClient
  user: User
  [key: string]: any
}

export type Falsey = '' | 0 | false | null | undefined
