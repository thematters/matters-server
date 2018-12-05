import { GraphQLResolveInfo } from 'graphql'

import {
  UserService,
  ActionService,
  ArticleService,
  CommentService
} from 'src/connectors'

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
  actionService: InstanceType<typeof ActionService>
  userService: InstanceType<typeof UserService>
}

export type ThirdPartyAccount = {
  accountName: 'facebook' | 'wechat' | 'google'
  baseUrl: string
  token: string
}
