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
  viewer: User | undefined
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
  | 'audio_draft'
  | 'comment'
  | 'comment_mentioned_user'
  | 'draft'
  | 'noop'
  | 'user'
  | 'user_oauth'
  | 'user_notify_setting'
  | 'report_article'
  | 'notice_detail'
  | 'notice'
  | 'notice_actor'
  | 'notice_entity'
  | 'push_device'

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

export type NoticeType =
  // user
  | 'user_new_follower'
  | 'user_disabled'
  // article
  | 'article_published'
  | 'article_reported'
  | 'article_archived'
  | 'article_new_downstream'
  | 'article_new_appreciation'
  | 'article_new_subscriber'
  | 'article_new_comment'
  | 'subscribed_article_new_comment'
  // comment
  | 'comment_pinned'
  | 'comment_reported'
  | 'comment_archived'
  | 'comment_new_reply'
  | 'comment_new_upvote'
  | 'comment_mentioned_you'
  // official
  | 'official_announcement'

export type PubSubType = 'article_updated'

export type NoticeEntity = {
  type: 'target' | 'downstream'
  entityType: string
  entity: any
}

export type NoticeUserNewFollowerParams = {
  type: 'user_new_follower'
  actors: [string]
  recipientId: string
}

export type NoticeUserDisabledParams = {
  type: 'user_disabled'
  data: { reason: string }
}

export type NoticeArticlePublishedParams = {
  type: 'article_published'
  entities: [NoticeEntity]
}

export type NoticeArticleReportedParams = {
  type: 'article_reported'
  entities: [NoticeEntity]
  data: { reason: string }
}

export type NoticeArticleArchivedParams = {
  type: 'article_archived'
  entities: [NoticeEntity]
  data: { reason: string }
}

export type NoticeArticleNewDownstreamParams = {
  type: 'article_new_downstream'
  actors: [string]
  entities: [NoticeEntity]
  data: { reason: string }
}

export type NoticeArticleNewAppreciationParams = {
  type: 'article_new_appreciation'
  actors: [string]
  entities: [NoticeEntity]
}

export type NoticeArticleNewSubscriberParams = {
  type: 'article_new_subscriber'
  actors: [string]
  entities: [NoticeEntity]
}

export type NoticeArticleNewCommentParams = {
  type: 'article_new_comment'
  actors: [string]
  entities: [NoticeEntity]
}

export type NoticeSubscribedArticleNewCommentParams = {
  type: 'subscribed_article_new_comment'
  actors: [string]
  entities: [NoticeEntity]
}

export type NoticeCommentPinnedParams = {
  type: 'comment_pinned'
  entities: [NoticeEntity]
}

export type NoticeCommentReportedParams = {
  type: 'comment_reported'
  entities: [NoticeEntity]
  data: { reason: string }
}

export type NoticeCommentArchivedParams = {
  type: 'comment_archived'
  entities: [NoticeEntity]
  data: { reason: string }
}

export type NoticeCommentNewReplyParams = {
  type: 'comment_new_reply'
  actors: [string]
  entities: [NoticeEntity]
}

export type NoticeCommentNewUpvoteParams = {
  type: 'comment_new_upvote'
  actors: [string]
  entities: [NoticeEntity]
}

export type NoticeCommentMentionedYouParams = {
  type: 'comment_mentioned_you'
  actors: [string]
  entities: [NoticeEntity]
}

export type NoticeOfficialAnnouncementParams = {
  type: 'official_announcement'
  message: string
  data: { link: string }
}

export type PubSubArticleUpdatedParams = {
  type: 'article_updated'
  article: any
}

export type NotificationType = PubSubType | NoticeType
export type NotificationPrarms =
  | NoticeUserNewFollowerParams
  | NoticeUserDisabledParams
  | NoticeArticlePublishedParams
  | NoticeArticleReportedParams
  | NoticeArticleArchivedParams
  | NoticeArticleNewDownstreamParams
  | NoticeArticleNewAppreciationParams
  | NoticeArticleNewSubscriberParams
  | NoticeArticleNewCommentParams
  | NoticeSubscribedArticleNewCommentParams
  | NoticeCommentPinnedParams
  | NoticeCommentReportedParams
  | NoticeCommentArchivedParams
  | NoticeCommentNewReplyParams
  | NoticeCommentNewUpvoteParams
  | NoticeCommentMentionedYouParams
  | NoticeOfficialAnnouncementParams
  | PubSubArticleUpdatedParams
