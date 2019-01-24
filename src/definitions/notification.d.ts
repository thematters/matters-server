import { TableName } from './'

export type NoticeType =
  // user
  | 'user_new_follower'
  // article
  | 'article_published'
  | 'article_new_downstream'
  | 'article_new_appreciation'
  | 'article_new_subscriber'
  | 'article_new_comment'
  | 'subscribed_article_new_comment'
  | 'upstream_article_archived'
  | 'downstream_article_archived'
  // comment
  | 'comment_pinned'
  | 'comment_new_reply'
  | 'comment_new_upvote'
  | 'comment_mentioned_you'
  // official
  | 'official_announcement'

export type PubSubType = 'article_updated'

export type NoticeEntityType =
  | 'target'
  | 'downstream'
  | 'upstream'
  | 'comment'
  | 'reply'

export type NotificationEntity<
  T extends NoticeEntityType = NoticeEntityType,
  K extends TableName = TableName
> = {
  type: T
  entityTable: K
  entity: any
}

export type NoticeUserNewFollowerParams = {
  event: 'user_new_follower'
  recipientId: string
  actorId: string
}

export type NoticeArticlePublishedParams = {
  event: 'article_published'
  recipientId: string
  entities: [NotificationEntity<'target', 'article'>]
}

export type NoticeArticleNewDownstreamParams = {
  event: 'article_new_downstream'
  recipientId: string
  actorId: string
  entities: [
    NotificationEntity<'target', 'article'>,
    NotificationEntity<'downstream', 'article'>
  ]
}

export type NoticeArticleNewAppreciationParams = {
  event: 'article_new_appreciation'
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'article'>]
}

export type NoticeArticleNewSubscriberParams = {
  event: 'article_new_subscriber'
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'article'>]
}

export type NoticeArticleNewCommentParams = {
  event: 'article_new_comment'
  recipientId: string
  actorId: string
  entities: [
    NotificationEntity<'target', 'article'>,
    NotificationEntity<'comment', 'comment'>
  ]
}

export type NoticeSubscribedArticleNewCommentParams = {
  event: 'subscribed_article_new_comment'
  recipientId: string
  actorId: string
  entities: [
    NotificationEntity<'target', 'article'>,
    NotificationEntity<'comment', 'comment'>
  ]
}

export type NoticeUpstreamArticleArchivedParams = {
  event: 'upstream_article_archived'
  recipientId: string
  entities: [
    NotificationEntity<'target', 'article'>,
    NotificationEntity<'upstream', 'article'>
  ]
}

export type NoticeDownstreamArticleArchivedParams = {
  event: 'downstream_article_archived'
  recipientId: string
  entities: [
    NotificationEntity<'target', 'article'>,
    NotificationEntity<'downstream', 'article'>
  ]
}

export type NoticeCommentPinnedParams = {
  event: 'comment_pinned'
  actorId: string
  recipientId: string
  entities: [NotificationEntity<'target', 'comment'>]
}

export type NoticeCommentNewReplyParams = {
  event: 'comment_new_reply'
  recipientId: string
  actorId: string
  entities: [
    NotificationEntity<'target', 'comment'>,
    NotificationEntity<'reply', 'comment'>
  ]
}

export type NoticeCommentNewUpvoteParams = {
  event: 'comment_new_upvote'
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'comment'>]
}

export type NoticeCommentMentionedYouParams = {
  event: 'comment_mentioned_you'
  recipientId: string
  actorId: string
  entities: [NotificationEntity<'target', 'comment'>]
}

export type NoticeOfficialAnnouncementParams = {
  event: 'official_announcement'
  recipientId: string
  message: string
  data: { url: string }
}

export type PubSubArticleUpdatedParams = {
  event: 'article_updated'
  entities: [NotificationEntity<'target', 'article'>]
}

export type NotificationType = PubSubType | NoticeType
export type NotificationPrarms =
  | NoticeUserNewFollowerParams
  | NoticeArticlePublishedParams
  | NoticeArticleNewDownstreamParams
  | NoticeArticleNewAppreciationParams
  | NoticeArticleNewSubscriberParams
  | NoticeArticleNewCommentParams
  | NoticeSubscribedArticleNewCommentParams
  | NoticeUpstreamArticleArchivedParams
  | NoticeDownstreamArticleArchivedParams
  | NoticeCommentPinnedParams
  | NoticeCommentNewReplyParams
  | NoticeCommentNewUpvoteParams
  | NoticeCommentMentionedYouParams
  | NoticeOfficialAnnouncementParams
  | PubSubArticleUpdatedParams
