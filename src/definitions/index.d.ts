import { GraphQLResolveInfo } from 'graphql'

import {
  UserService,
  ArticleService,
  CommentService,
  DraftService
} from 'connectors'

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
  id: number
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

export type Context = {
  viewer: User | undefined
  articleService: InstanceType<typeof ArticleService>
  commentService: InstanceType<typeof CommentService>
  draftService: InstanceType<typeof DraftService>
  userService: InstanceType<typeof UserService>
}

export type TableName =
  | 'action'
  | 'action_user'
  | 'action_comment'
  | 'action_article'
  | 'appreciate'
  | 'article'
  | 'article_read'
  | 'audio_draft'
  | 'comment'
  | 'draft'
  | 'user'
  | 'user_oauth'
  | 'user_notify_setting'
  | 'report_article'

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
