import { GraphQLResolveInfo } from 'graphql'

import { UserService, ArticleService, CommentService } from 'src/connectors'

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

export type Context = {
  articleService: InstanceType<typeof ArticleService>
  commentService: InstanceType<typeof CommentService>
  userService: InstanceType<typeof UserService>
}

export type ThirdPartyAccount = {
  accountName: 'facebook' | 'wechat' | 'google'
  baseUrl: string
  token: string
}
