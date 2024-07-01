import {
  NOTICE_TYPE,
  BUNDLED_NOTICE_TYPE,
  OFFICIAL_NOTICE_EXTEND_TYPE,
} from 'common/enums/notification'
import { TableName, User } from 'definitions'

export type BaseNoticeType = keyof typeof NOTICE_TYPE

export type BundledNoticeType = keyof typeof BUNDLED_NOTICE_TYPE

export type OfficialNoticeExtendType = keyof typeof OFFICIAL_NOTICE_EXTEND_TYPE

export type NoticeEntityType =
  // primary target
  | 'target'
  // secondary target
  | 'comment'
  | 'reply'
  | 'collection'
  | 'tag'
  | 'article'
  | 'circle'

export type NotificationType =
  | BaseNoticeType
  | BundledNoticeType
  | OfficialNoticeExtendType

export interface NotificationRequiredParams {
  event: NotificationType
  recipientId: string
}

export interface NotificationEntity<
  T extends NoticeEntityType = NoticeEntityType,
  K extends TableName = TableName
> {
  type: T
  entityTable: K
  entity: any
}

/**
 * User
 */
export interface NoticeUserNewFollowerParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.user_new_follower
  recipientId: string
  actorId: string
}

/**
 * Article
 */
export interface NoticeArticlePublishedParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.article_published
  recipientId: string
  entities: [NotificationEntity<'target', 'article'>]
}

export interface NoticeArticleNewAppreciationParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.article_new_appreciation
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'article'>]
}

export interface NoticeArticleNewSubscriberParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.article_new_subscriber
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'article'>]
}

export interface NoticeArticleMentionedYouParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.article_mentioned_you
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'article'>]
}

export interface NoticeRevisedArticlePublishedParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.revised_article_published
  recipientId: string
  entities: [NotificationEntity<'target', 'article'>]
}

export interface NoticeRevisedArticleNotPublishedParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.revised_article_not_published
  recipientId: string
  entities: [NotificationEntity<'target', 'article'>]
}

export interface NoticeCircleNewArticleParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.circle_new_article
  recipientId: string
  entities: [NotificationEntity<'target', 'article'>]
}

// Article-Article
export interface NoticeArticleNewConnectedParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.article_new_collected
  recipientId: string
  actorId: string
  entities: [
    NotificationEntity<'target', 'article'>,
    NotificationEntity<'collection', 'article'>
  ]
}

/**
 * Comment
 */
export interface NoticeArticleNewCommentParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.article_new_comment
  recipientId: string
  actorId: string
  entities: [
    NotificationEntity<'target', 'article'>,
    NotificationEntity<'comment', 'comment'>
  ]
}

export interface NoticeCommentPinnedParams extends NotificationRequiredParams {
  event: NOTICE_TYPE.comment_pinned
  actorId: string
  recipientId: string
  entities: [NotificationEntity<'target', 'comment'>]
}

export interface NoticeCommentMentionedYouParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.article_comment_mentioned_you
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'comment'>]
}

export interface NoticeCircleNewBroadcastParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.circle_new_broadcast
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'comment'>]
}

// Comment-Comment
export interface NoticeCommentNewReplyParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.comment_new_reply
  recipientId: string
  actorId: string
  entities: [
    NotificationEntity<'target', 'comment'>,
    NotificationEntity<'reply', 'comment'>
  ]
}

/**
 * Transaction
 */
export interface NoticePaymentReceivedDonationParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.payment_received_donation
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'transaction'>]
}

/**
 * Circle
 */
export interface NoticeCircleInvitationParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.circle_invitation
  actorId: string
  recipientId: string
  entities: [NotificationEntity<'target', 'circle'>]
}

export interface NoticeCircleBroadcastMentionedYouParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.circle_broadcast_mentioned_you
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'circle'>]
  data: { entityTypeId: string; entityId: string }
}

export interface NoticeCircleDiscussionMentionedYouParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.circle_discussion_mentioned_you
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'circle'>]
  data: { entityTypeId: string; entityId: string }
}

// for circle owner
export interface NoticeCircleNewSubscriberParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.circle_new_subscriber
  actorId: string
  recipientId: string
  entities: [NotificationEntity<'target', 'circle'>]
}

export interface NoticeCircleNewFollowerParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.circle_new_follower
  actorId: string
  recipientId: string
  entities: [NotificationEntity<'target', 'circle'>]
}

export interface NoticeCircleNewUnsubscriberParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.circle_new_unsubscriber
  actorId: string
  recipientId: string
  entities: [NotificationEntity<'target', 'circle'>]
}

export interface NoticeCircleNewBroadcastCommentsParams
  extends NotificationRequiredParams {
  event: BundledNoticeType
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'circle'>]
  data: { comments?: string[]; replies?: string[]; mentions?: string[] }
}

export interface NoticeCircleNewDiscussionCommentsParams
  extends NotificationRequiredParams {
  event: BundledNoticeType
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'circle'>]
  data: { comments?: string[]; replies?: string[]; mentions?: string[] }
}

/**
 * System
 */
export interface NoticeOfficialAnnouncementParams
  extends NotificationRequiredParams {
  event: NOTICE_TYPE.official_announcement
  recipientId: string
  message: string
  data: { url: string }
}

// Punish
export interface NoticeUserBannedParams extends NotificationRequiredParams {
  event: OFFICIAL_NOTICE_EXTEND_TYPE.user_banned
  recipientId: string
}

export interface NoticeUserFrozenParams extends NotificationRequiredParams {
  event: OFFICIAL_NOTICE_EXTEND_TYPE.user_frozen
  recipientId: string
}

export interface NoticeUserUnbannedParams extends NotificationRequiredParams {
  event: OFFICIAL_NOTICE_EXTEND_TYPE.user_unbanned
  recipientId: string
}

export interface NoticeCommentBannedParams extends NotificationRequiredParams {
  event: OFFICIAL_NOTICE_EXTEND_TYPE.comment_banned
  entities: [NotificationEntity<'target', 'comment'>]
  recipientId: string
}

export interface NoticeArticleBannedParams extends NotificationRequiredParams {
  event: OFFICIAL_NOTICE_EXTEND_TYPE.article_banned
  entities: [NotificationEntity<'target', 'article'>]
  recipientId: string
}

export interface NoticeArticleReportedParams
  extends NotificationRequiredParams {
  event: OFFICIAL_NOTICE_EXTEND_TYPE.article_reported
  entities: [NotificationEntity<'target', 'article'>]
  recipientId: string
}

export interface NoticeCommentReportedParams
  extends NotificationRequiredParams {
  event: OFFICIAL_NOTICE_EXTEND_TYPE.comment_reported
  entities: [NotificationEntity<'target', 'comment'>]
  recipientId: string
}

export type NotificationPrarms =
  // User
  | NoticeUserNewFollowerParams
  // Article
  | NoticeArticlePublishedParams
  | NoticeArticleNewConnectedParams
  | NoticeArticleNewAppreciationParams
  | NoticeArticleNewSubscriberParams
  | NoticeArticleNewCommentParams
  | NoticeArticleMentionedYouParams
  | NoticeRevisedArticlePublishedParams
  | NoticeRevisedArticleNotPublishedParams
  | NoticeCircleNewArticleParams
  // Comment
  | NoticeCommentPinnedParams
  | NoticeCommentMentionedYouParams
  | NoticeCircleNewBroadcastParams
  // Comment-Comment
  | NoticeCommentNewReplyParams
  // Payment
  | NoticePaymentReceivedDonationParams
  // Circle
  | NoticeCircleInvitationParams
  | NoticeCircleNewSubscriberParams
  | NoticeCircleNewFollowerParams
  | NoticeCircleNewUnsubscriberParams
  | NoticeCircleNewBroadcastCommentsParams
  | NoticeCircleNewDiscussionCommentsParams
  // Official
  | NoticeOfficialAnnouncementParams
  | NoticeUserBannedParams
  | NoticeUserFrozenParams
  | NoticeUserUnbannedParams
  | NoticeCommentBannedParams
  | NoticeArticleBannedParams
  | NoticeArticleReportedParams
  | NoticeCommentReportedParams
  // Crypto
  | NoticeCryptoAirdropParams
  | NoticeCryptoConnectedParams

export type NoticeUserId = string

export interface NoticeEntity {
  type: NoticeEntityType
  table: TableName
  entityId: string
}

export type NoticeEntitiesMap = Record<NoticeEntityType, any>
export type NoticeMessage = string
export interface NoticeData {
  // used by official annoncement notices
  link?: string
  // reason for banned/frozen users, not in used
  reason?: string

  // usde by circle new bundled notices
  comments?: string[]
  replies?: string[]
  mentions?: string[]
}

export interface NoticeDetail {
  id: string
  unread: boolean
  deleted: boolean
  updatedAt: Date
  noticeType: BaseNoticeType
  message?: NoticeMessage
  data?: NoticeData
}

export type NoticeItem = NoticeDetail & {
  createdAt: Date
  type: BaseNoticeType
  actors?: User[]
  entities?: NoticeEntitiesMap
}

export interface PutNoticeParams {
  type: BaseNoticeType
  actorId?: NoticeUserId
  recipientId: NoticeUserId
  entities?: NotificationEntity[]
  message?: NoticeMessage | null
  data?: NoticeData | null

  resend?: boolean // used by circle invitation notice

  bundle?: {
    disabled?: boolean
    mergeData?: boolean // used by circle bundled notice
  }
}

// DB schema

export interface Notice {
  id: string
  uuid: string
  unread: boolean
  deleted: boolean
  noticeDetailId: string
  recipientId: string
  createdAt: Date
  updatedAt: Date
}

export interface NoticeDetail {
  id: string
  noticeType: string
  message: string
  data: any
  createdAt: Date
}
