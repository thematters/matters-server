import { GraphQLResolveInfo } from 'graphql'

import {
  UserService,
  ArticleService,
  CommentService,
  DraftService,
  SystemService,
  TagService,
  NotificationService
} from 'connectors'
import { DataSource } from 'apollo-datasource'

export * from './schema'
export * from './notification'

export type NodeTypes = 'Article' | 'User' | 'Comment' | 'Draft' | 'Tag'

export type Resolver = (
  parent: any,
  args: any,
  context: Context,
  info: GraphQLResolveInfo
) => any

export interface ResolverMap {
  [key: string]: {
    [key: string]: Resolver
  }
}

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
  mat: number
  language: string
  oauthType: any
  role: string
  status: string
  createdAt: string
  updatedAt: string
}

export type Context = RequestContext & {
  dataSources: DataSources
}

export type RequestContext = {
  viewer: User | { id: null }
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
  | 'action_user'
  | 'action_comment'
  | 'action_article'
  | 'appreciate'
  | 'asset'
  | 'article'
  | 'tag'
  | 'article_read'
  | 'article_tag'
  | 'audio_draft'
  | 'comment'
  | 'comment_mentioned_user'
  | 'draft'
  | 'noop'
  | 'user'
  | 'user_oauth'
  | 'user_notify_setting'
  | 'notice_detail'
  | 'notice'
  | 'notice_actor'
  | 'notice_entity'
  | 'push_device'
  | 'report'
  | 'report_asset'
  | 'feedback'
  | 'feedback_asset'

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

export type S3Folder = 'avatar' | 'audioDraft' | 'draft'

export type S3Bucket =
  | 'matters-server-dev'
  | 'matters-server-stage'
  | 'matters-server-production'

export type Item = { id: string; [key: string]: any }

export type ItemData = { [key: string]: any }
