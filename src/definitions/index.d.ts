import { GraphQLResolveInfo } from 'graphql'

import {
  UserService,
  ArticleService,
  CommentService,
  DraftService,
  TagService
} from 'connectors'

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
  tagService: InstanceType<typeof TagService>
}

export type TableName =
  | 'action'
  | 'action_user'
  | 'action_comment'
  | 'action_article'
  | 'appreciate'
  | 'article'
  | 'tag'
  | 'article_read'
  | 'audio_draft'
  | 'comment'
  | 'draft'
  | 'user'
  | 'user_oauth'
  | 'user_notify_setting'
  | 'report_article'
  | 'notice_detail'
  | 'notice'
  | 'notice_actor'
  | 'notice_entity'

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

export type NoticeType =
  // user
  | 'user_new_follower'
  | 'user_disabled'
  // article
  | 'article_published'
  | 'article_reported'
  | 'article_archived_violation'
  | 'article_new_downstream'
  | 'article_new_appreciation'
  | 'article_new_subscriber'
  | 'article_new_comment'
  | 'subscribed_article_new_comment'
  // comment
  | 'comment_pinned'
  | 'comment_reported'
  | 'comment_archived_violation'
  | 'comment_new_reply'
  | 'comment_new_upvote'
  | 'comment_mentioned_you'
  // official
  | 'official_announcement'
