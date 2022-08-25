import {
  DB_NOTICE_TYPE,
  BUNDLED_NOTICE_TYPE,
  OFFICIAL_NOTICE_EXTEND_TYPE,
} from 'common/enums/notification'
import { TableName, User } from 'definitions'

export type DBNoticeType = keyof typeof DB_NOTICE_TYPE

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
  | DBNoticeType
  | BundledNoticeType
  | OfficialNoticeExtendType

export interface NotificationRequiredParams {
  event: NotificationType
  recipientId: string
}

export type NotificationEntity<
  T extends NoticeEntityType = NoticeEntityType,
  K extends TableName = TableName
> = {
  type: T
  entityTable: K
  entity: any
}

/**
 * User
 */
export interface NoticeUserNewFollowerParams
  extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.user_new_follower
  recipientId: string
  actorId: string
}

/**
 * Article
 */
export interface NoticeArticlePublishedParams
  extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.article_published
  recipientId: string
  entities: [NotificationEntity<'target', 'article'>]
}

export interface NoticeArticleNewAppreciationParams
  extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.article_new_appreciation
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'article'>]
}

export interface NoticeArticleNewSubscriberParams
  extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.article_new_subscriber
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'article'>]
}

export interface NoticeArticleMentionedYouParams
  extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.article_mentioned_you
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'article'>]
}

export interface NoticeRevisedArticlePublishedParams
  extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.revised_article_published
  recipientId: string
  entities: [NotificationEntity<'target', 'article'>]
}

export interface NoticeRevisedArticleNotPublishedParams
  extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.revised_article_not_published
  recipientId: string
  entities: [NotificationEntity<'target', 'article'>]
}

export interface NoticeCircleNewArticleParams
  extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.circle_new_article
  recipientId: string
  entities: [NotificationEntity<'target', 'article'>]
}

// Article-Article
export interface NoticeArticleNewCollectedParams
  extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.article_new_collected
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
  event: DB_NOTICE_TYPE.article_new_comment
  recipientId: string
  actorId: string
  entities: [
    NotificationEntity<'target', 'article'>,
    NotificationEntity<'comment', 'comment'>
  ]
}

export interface NoticeCommentPinnedParams extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.comment_pinned
  actorId: string
  recipientId: string
  entities: [NotificationEntity<'target', 'comment'>]
}

export interface NoticeCommentMentionedYouParams
  extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.comment_mentioned_you
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'comment'>]
}

export interface NoticeSubscribedArticleNewCommentParams
  extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.subscribed_article_new_comment
  recipientId: string
  actorId: string
  entities: [
    NotificationEntity<'target', 'article'>,
    NotificationEntity<'comment', 'comment'>
  ]
}

export interface NoticeCircleNewBroadcastParams
  extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.circle_new_broadcast
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'comment'>]
}

// Comment-Comment
export interface NoticeCommentNewReplyParams
  extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.comment_new_reply
  recipientId: string
  actorId: string
  entities: [
    NotificationEntity<'target', 'comment'>,
    NotificationEntity<'reply', 'comment'>
  ]
}

/**
 * Tag
 */
export interface NoticeTagAdoptionParams extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.tag_adoption
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'tag'>]
}

export interface NoticeTagLeaveParams extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.tag_leave
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'tag'>]
}

export interface NoticeTagAddEditorParams extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.tag_add_editor
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'tag'>]
}

export interface NoticeTagLeaveEditorParams extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.tag_leave_editor
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'tag'>]
}

// Article-Tag
export interface NoticeArticleTagHasBeenAddedParams
  extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.article_tag_has_been_added
  recipientId: string
  actorId: string
  entities: [
    NotificationEntity<'target', 'article'>,
    NotificationEntity<'tag', 'tag'>
  ]
}

export interface NoticeArticleTagHasBeenRemovedParams
  extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.article_tag_has_been_removed
  recipientId: string
  actorId: string
  entities: [
    NotificationEntity<'target', 'article'>,
    NotificationEntity<'tag', 'tag'>
  ]
}

/**
 * Transaction
 */
export interface NoticePaymentReceivedDonationParams
  extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.payment_received_donation
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'transaction'>]
}

export interface NoticePaymentPayoutParams extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.payment_payout
  recipientId: string
  entities: [NotificationEntity<'target', 'transaction'>]
}

/**
 * Circle
 */
export interface NoticeCircleInvitationParams
  extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.circle_invitation
  actorId: string
  recipientId: string
  entities: [NotificationEntity<'target', 'circle'>]
}

export interface NoticeCircleBroadcastMentionedYouParams
  extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.circle_broadcast_mentioned_you
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'circle'>]
  data: { entityTypeId: string; entityId: string }
}

export interface NoticeCircleDiscussionMentionedYouParams
  extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.circle_discussion_mentioned_you
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'circle'>]
  data: { entityTypeId: string; entityId: string }
}

// for circle owner
export interface NoticeCircleNewSubscriberParams
  extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.circle_new_subscriber
  actorId: string
  recipientId: string
  entities: [NotificationEntity<'target', 'circle'>]
}

export interface NoticeCircleNewFollowerParams
  extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.circle_new_follower
  actorId: string
  recipientId: string
  entities: [NotificationEntity<'target', 'circle'>]
}

export interface NoticeCircleNewUnsubscriberParams
  extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.circle_new_unsubscriber
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
  event: DB_NOTICE_TYPE.official_announcement
  recipientId: string
  message: string
  data: { url: string }
}

export interface NoticeUserActivatedParams extends NotificationRequiredParams {
  event: OFFICIAL_NOTICE_EXTEND_TYPE.user_activated
  recipientId: string
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

export interface NoticeCryptoAirdropParams extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.crypto_wallet_airdrop
  entities: [NotificationEntity<'target', 'crypto_wallet'>]
  recipientId: string
}

export interface NoticeCryptoConnectedParams
  extends NotificationRequiredParams {
  event: DB_NOTICE_TYPE.crypto_wallet_connected
  entities: [NotificationEntity<'target', 'crypto_wallet'>]
  recipientId: string
}

export type NotificationPrarms =
  // User
  | NoticeUserNewFollowerParams
  // Article
  | NoticeArticlePublishedParams
  | NoticeArticleNewCollectedParams
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
  | NoticeSubscribedArticleNewCommentParams
  | NoticeCircleNewBroadcastParams
  // Comment-Comment
  | NoticeCommentNewReplyParams
  // Tag
  | NoticeArticleTagHasBeenAddedParams
  | NoticeArticleTagHasBeenRemovedParams
  | NoticeTagAdoptionParams
  | NoticeTagLeaveParams
  | NoticeTagAddEditorParams
  | NoticeTagLeaveEditorParams
  // Payment
  | NoticePaymentReceivedDonationParams
  | NoticePaymentPayoutParams
  // Circle
  | NoticeCircleInvitationParams
  | NoticeCircleNewSubscriberParams
  | NoticeCircleNewFollowerParams
  | NoticeCircleNewUnsubscriberParams
  | NoticeCircleNewBroadcastCommentsParams
  | NoticeCircleNewDiscussionCommentsParams
  // Official
  | NoticeOfficialAnnouncementParams
  | NoticeUserActivatedParams
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

export type NoticeEntity = {
  type: NoticeEntityType
  table: TableName
  entityId: string
}

export type NoticeEntitiesMap = Record<NoticeEntityType, any>
export type NoticeMessage = string
export type NoticeData = {
  // used by official annoncement notices
  url?: string
  // reason for banned/frozen users, not in used
  reason?: string

  // usde by circle new bundled notices
  comments?: string[]
  replies?: string[]
  mentions?: string[]
}

export type NoticeDetail = {
  id: string
  unread: boolean
  deleted: boolean
  updatedAt: Date
  noticeType: DBNoticeType
  message?: NoticeMessage
  data?: NoticeData
}

export type NoticeItem = NoticeDetail & {
  createdAt: Date
  type: DBNoticeType
  actors?: User[]
  entities?: NoticeEntitiesMap
}

export type PutNoticeParams = {
  type: DBNoticeType
  actorId?: NoticeUserId
  recipientId: NoticeUserId
  entities?: NotificationEntity[]
  message?: NoticeMessage | null
  data?: NoticeData | null

  resend?: boolean // used by circle invitation notice

  bundle?: {
    mergeData: boolean // used by circle bundled notice
  }
}
