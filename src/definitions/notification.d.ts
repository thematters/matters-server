import { TableName, User } from 'definitions'

export type DBNoticeType =
  // user
  | 'user_new_follower'
  // article
  | 'article_published'
  | 'article_new_collected'
  | 'article_new_appreciation'
  | 'article_new_subscriber'
  | 'article_new_comment'
  | 'article_mentioned_you'
  | 'subscribed_article_new_comment'
  | 'article_tag_has_been_added'
  | 'article_tag_has_been_removed'
  | 'article_tag_has_been_unselected'
  | 'revised_article_published'
  | 'revised_article_not_published'
  // comment
  | 'comment_pinned'
  | 'comment_new_reply'
  | 'comment_mentioned_you'
  // payment
  | 'payment_received_donation'
  | 'payment_payout'
  // official
  | 'official_announcement'
  // tag
  | 'tag_adoption'
  | 'tag_leave'
  | 'tag_add_editor'
  | 'tag_leave_editor'

export type OfficialNoticeExtendType =
  | 'user_activated'
  | 'user_banned'
  | 'user_frozen'
  | 'user_unbanned'
  | 'comment_banned'
  | 'article_banned'
  | 'article_reported'
  | 'comment_reported'

export type NoticeEntityType =
  | 'target'
  | 'comment'
  | 'reply'
  | 'collection'
  | 'tag'

export type NotificationType = DBNoticeType | OfficialNoticeExtendType

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
  event: 'user_new_follower'
  recipientId: string
  actorId: string
}

/**
 * Article
 */
export interface NoticeArticlePublishedParams
  extends NotificationRequiredParams {
  event: 'article_published'
  recipientId: string
  entities: [NotificationEntity<'target', 'article'>]
}

export interface NoticeArticleNewCollectedParams
  extends NotificationRequiredParams {
  event: 'article_new_collected'
  recipientId: string
  actorId: string
  entities: [
    NotificationEntity<'target', 'article'>,
    NotificationEntity<'collection', 'article'>
  ]
}

export interface NoticeArticleNewAppreciationParams
  extends NotificationRequiredParams {
  event: 'article_new_appreciation'
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'article'>]
}

export interface NoticeArticleNewSubscriberParams
  extends NotificationRequiredParams {
  event: 'article_new_subscriber'
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'article'>]
}

export interface NoticeArticleNewCommentParams
  extends NotificationRequiredParams {
  event: 'article_new_comment'
  recipientId: string
  actorId: string
  entities: [
    NotificationEntity<'target', 'article'>,
    NotificationEntity<'comment', 'comment'>
  ]
}

export interface NoticeArticleMentionedYouParams
  extends NotificationRequiredParams {
  event: 'article_mentioned_you'
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'article'>]
}

export interface NoticeSubscribedArticleNewCommentParams
  extends NotificationRequiredParams {
  event: 'subscribed_article_new_comment'
  recipientId: string
  actorId: string
  entities: [
    NotificationEntity<'target', 'article'>,
    NotificationEntity<'comment', 'comment'>
  ]
}

export interface NoticeRevisedArticlePublishedParams
  extends NotificationRequiredParams {
  event: 'revised_article_published'
  recipientId: string
  entities: [NotificationEntity<'target', 'article'>]
}

export interface NoticeRevisedArticleNotPublishedParams
  extends NotificationRequiredParams {
  event: 'revised_article_not_published'
  recipientId: string
  entities: [NotificationEntity<'target', 'article'>]
}

/**
 * Comment
 */
export interface NoticeCommentPinnedParams extends NotificationRequiredParams {
  event: 'comment_pinned'
  actorId: string
  recipientId: string
  entities: [NotificationEntity<'target', 'comment'>]
}

export interface NoticeCommentNewReplyParams
  extends NotificationRequiredParams {
  event: 'comment_new_reply'
  recipientId: string
  actorId: string
  entities: [
    NotificationEntity<'target', 'comment'>,
    NotificationEntity<'reply', 'comment'>
  ]
}

export interface NoticeCommentMentionedYouParams
  extends NotificationRequiredParams {
  event: 'comment_mentioned_you'
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'comment'>]
}

/**
 * Tag
 */
export interface NoticeArticleTagHasBeenAddedParams
  extends NotificationRequiredParams {
  event: 'article_tag_has_been_added'
  recipientId: string
  actorId: string
  entities: [
    NotificationEntity<'target', 'article'>,
    NotificationEntity<'tag', 'tag'>
  ]
}

export interface NoticeArticleTagHasBeenRemovedParams
  extends NotificationRequiredParams {
  event: 'article_tag_has_been_removed'
  recipientId: string
  actorId: string
  entities: [
    NotificationEntity<'target', 'article'>,
    NotificationEntity<'tag', 'tag'>
  ]
}

export interface NoticeArticleTagHasBeenUnselectedParams
  extends NotificationRequiredParams {
  event: 'article_tag_has_been_unselected'
  recipientId: string
  actorId: string
  entities: [
    NotificationEntity<'target', 'article'>,
    NotificationEntity<'tag', 'tag'>
  ]
}

export interface NoticeUserActivatedParams extends NotificationRequiredParams {
  event: 'user_activated'
  recipientId: string
}

/**
 * Payment
 */
export interface NoticePaymentReceivedDonationParams
  extends NotificationRequiredParams {
  event: 'payment_received_donation'
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'transaction'>]
}

export interface NoticePaymentPayoutParams extends NotificationRequiredParams {
  event: 'payment_payout'
  recipientId: string
  entities: [NotificationEntity<'target', 'transaction'>]
}

/**
 * Official Announcement
 */
export interface NoticeOfficialAnnouncementParams
  extends NotificationRequiredParams {
  event: 'official_announcement'
  recipientId: string
  message: string
  data: { url: string }
}

/**
 * Punish
 */
export interface NoticeUserBannedParams extends NotificationRequiredParams {
  event: 'user_banned'
  recipientId: string
}

export interface NoticeUserFrozenParams extends NotificationRequiredParams {
  event: 'user_frozen'
  recipientId: string
}

export interface NoticeUserUnbannedParams extends NotificationRequiredParams {
  event: 'user_unbanned'
  recipientId: string
}

export interface NoticeCommentBannedParams extends NotificationRequiredParams {
  event: 'comment_banned'
  entities: [NotificationEntity<'target', 'comment'>]
  recipientId: string
}

export interface NoticeArticleBannedParams extends NotificationRequiredParams {
  event: 'article_banned'
  entities: [NotificationEntity<'target', 'article'>]
  recipientId: string
}

/**
 * Report
 */
export interface NoticeArticleReportedParams
  extends NotificationRequiredParams {
  event: 'article_reported'
  entities: [NotificationEntity<'target', 'article'>]
  recipientId: string
}

export interface NoticeCommentReportedParams
  extends NotificationRequiredParams {
  event: 'comment_reported'
  entities: [NotificationEntity<'target', 'comment'>]
  recipientId: string
}

/**
 * Tag
 */
export interface NoticeTagAdoptionParams extends NotificationRequiredParams {
  event: 'tag_adoption'
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'tag'>]
}

export interface NoticeTagLeaveParams extends NotificationRequiredParams {
  event: 'tag_leave'
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'tag'>]
}

export interface NoticeTagAddEditorParams extends NotificationRequiredParams {
  event: 'tag_add_editor'
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'tag'>]
}

export interface NoticeTagLeaveEditorParams extends NotificationRequiredParams {
  event: 'tag_leave_editor'
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'tag'>]
}

export type NotificationPrarms =
  | NoticeUserNewFollowerParams
  | NoticeArticlePublishedParams
  | NoticeArticleNewCollectedParams
  | NoticeArticleNewAppreciationParams
  | NoticeArticleNewSubscriberParams
  | NoticeArticleNewCommentParams
  | NoticeArticleMentionedYouParams
  | NoticeSubscribedArticleNewCommentParams
  | NoticeCommentPinnedParams
  | NoticeCommentNewReplyParams
  | NoticeCommentMentionedYouParams
  | NoticeOfficialAnnouncementParams
  | NoticeUserActivatedParams
  | NoticePaymentReceivedDonationParams
  | NoticePaymentPayoutParams
  | NoticeUserBannedParams
  | NoticeUserFrozenParams
  | NoticeUserUnbannedParams
  | NoticeCommentBannedParams
  | NoticeArticleBannedParams
  | NoticeArticleReportedParams
  | NoticeCommentReportedParams
  | NoticeArticleTagHasBeenAddedParams
  | NoticeArticleTagHasBeenRemovedParams
  | NoticeArticleTagHasBeenUnselectedParams
  | NoticeTagAdoptionParams
  | NoticeTagLeaveParams
  | NoticeTagAddEditorParams
  | NoticeTagLeaveEditorParams
  | NoticeRevisedArticlePublishedParams
  | NoticeRevisedArticleNotPublishedParams

export type NoticeUserId = string

export type NoticeEntity = {
  type: NoticeEntityType
  table: TableName
  entityId: string
}

export type NoticeEntitiesMap = { [key in NoticeEntityType]: any }
export type NoticeMessage = string
export type NoticeData = {
  url?: string
  reason?: string
}

export type NoticeDetail = {
  id: string
  uuid: string
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
}
