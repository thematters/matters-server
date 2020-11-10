import {
  DBNoticeType,
  GQLArticleMentionedYouNoticeTypeResolver,
  GQLArticleNewAppreciationNoticeTypeResolver,
  GQLArticleNewCollectedNoticeTypeResolver,
  GQLArticleNewCommentNoticeTypeResolver,
  GQLArticleNewDownstreamNoticeTypeResolver,
  GQLArticleNewSubscriberNoticeTypeResolver,
  GQLArticlePublishedNoticeTypeResolver,
  GQLArticleTagHasBeenAddedNoticeTypeResolver,
  GQLArticleTagHasBeenRemovedNoticeTypeResolver,
  GQLArticleTagHasBeenUnselectedNoticeTypeResolver,
  GQLCommentMentionedYouNoticeTypeResolver,
  GQLCommentNewReplyNoticeTypeResolver,
  GQLCommentPinnedNoticeTypeResolver,
  GQLDownstreamArticleArchivedNoticeTypeResolver,
  GQLOfficialAnnouncementNoticeTypeResolver,
  GQLPaymentPayoutNoticeTypeResolver,
  GQLPaymentReceivedDonationNoticeTypeResolver,
  GQLRevisedArticleNotPublishedNoticeTypeResolver,
  GQLRevisedArticlePublishedNoticeTypeResolver,
  GQLSubscribedArticleNewCommentNoticeTypeResolver,
  GQLTagAddEditorNoticeTypeResolver,
  GQLTagAdoptionNoticeTypeResolver,
  GQLTagLeaveEditorNoticeTypeResolver,
  GQLTagLeaveNoticeTypeResolver,
  GQLUpstreamArticleArchivedNoticeTypeResolver,
  GQLUserNewFollowerNoticeTypeResolver,
  GQLUserTypeResolver,
} from 'definitions'

import notices from './notices'

const notice: {
  User: GQLUserTypeResolver
  Notice: any
  UserNewFollowerNotice: GQLUserNewFollowerNoticeTypeResolver
  ArticlePublishedNotice: GQLArticlePublishedNoticeTypeResolver
  ArticleNewDownstreamNotice: GQLArticleNewDownstreamNoticeTypeResolver
  ArticleNewCollectedNotice: GQLArticleNewCollectedNoticeTypeResolver
  ArticleNewAppreciationNotice: GQLArticleNewAppreciationNoticeTypeResolver
  ArticleNewSubscriberNotice: GQLArticleNewSubscriberNoticeTypeResolver
  ArticleNewCommentNotice: GQLArticleNewCommentNoticeTypeResolver
  ArticleMentionedYouNotice: GQLArticleMentionedYouNoticeTypeResolver
  UpstreamArticleArchivedNotice: GQLUpstreamArticleArchivedNoticeTypeResolver
  SubscribedArticleNewCommentNotice: GQLSubscribedArticleNewCommentNoticeTypeResolver
  DownstreamArticleArchivedNotice: GQLDownstreamArticleArchivedNoticeTypeResolver
  CommentPinnedNotice: GQLCommentPinnedNoticeTypeResolver
  CommentNewReplyNotice: GQLCommentNewReplyNoticeTypeResolver
  CommentMentionedYouNotice: GQLCommentMentionedYouNoticeTypeResolver
  OfficialAnnouncementNotice: GQLOfficialAnnouncementNoticeTypeResolver
  ArticleTagHasBeenAddedNotice: GQLArticleTagHasBeenAddedNoticeTypeResolver
  ArticleTagHasBeenRemovedNotice: GQLArticleTagHasBeenRemovedNoticeTypeResolver
  ArticleTagHasBeenUnselectedNotice: GQLArticleTagHasBeenUnselectedNoticeTypeResolver
  PaymentReceivedDonationNotice: GQLPaymentReceivedDonationNoticeTypeResolver
  PaymentPayoutNotice: GQLPaymentPayoutNoticeTypeResolver
  TagAdoptionNotice: GQLTagAdoptionNoticeTypeResolver
  TagLeaveNotice: GQLTagLeaveNoticeTypeResolver
  TagAddEditorNotice: GQLTagAddEditorNoticeTypeResolver
  TagLeaveEditorNotice: GQLTagLeaveEditorNoticeTypeResolver
  RevisedArticlePublishedNotice: GQLRevisedArticlePublishedNoticeTypeResolver
  RevisedArticleNotPublishedNotice: GQLRevisedArticleNotPublishedNoticeTypeResolver
} = {
  User: {
    notices,
  },
  Notice: {
    __resolveType: ({ type }: { type: DBNoticeType }) => {
      const noticeTypeMap = {
        // user
        user_new_follower: 'UserNewFollowerNotice',
        // article
        article_published: 'ArticlePublishedNotice',
        article_new_downstream: 'ArticleNewDownstreamNotice',
        article_new_collected: 'ArticleNewCollectedNotice',
        article_new_appreciation: 'ArticleNewAppreciationNotice',
        article_new_subscriber: 'ArticleNewSubscriberNotice',
        article_new_comment: 'ArticleNewCommentNotice',
        article_mentioned_you: 'ArticleMentionedYouNotice',
        subscribed_article_new_comment: 'SubscribedArticleNewCommentNotice',
        upstream_article_archived: 'UpstreamArticleArchivedNotice',
        downstream_article_archived: 'DownstreamArticleArchivedNotice',
        article_tag_has_been_added: 'ArticleTagHasBeenAddedNotice',
        article_tag_has_been_removed: 'ArticleTagHasBeenRemovedNotice',
        article_tag_has_been_unselected: 'ArticleTagHasBeenUnselectedNotice',
        revised_article_published: 'RevisedArticlePublishedNotice',
        revised_article_not_published: 'RevisedArticleNotPublishedNotice',
        // comment
        comment_pinned: 'CommentPinnedNotice',
        comment_new_reply: 'CommentNewReplyNotice',
        comment_mentioned_you: 'CommentMentionedYouNotice',
        // payment
        payment_received_donation: 'PaymentReceivedDonationNotice',
        payment_payout: 'PaymentPayoutNotice',
        // tag
        tag_adoption: 'TagAdoptionNotice',
        tag_leave: 'TagLeaveNotice',
        tag_add_editor: 'TagAddEditorNotice',
        tag_leave_editor: 'TagLeaveEditorNotice',

        // official
        official_announcement: 'OfficialAnnouncementNotice',
      }
      return noticeTypeMap[type]
    },
  },
  UserNewFollowerNotice: {
    id: ({ uuid }) => uuid,
  },
  ArticlePublishedNotice: {
    id: ({ uuid }) => uuid,
    target: ({ entities }, _, { dataSources: { draftService } }) =>
      draftService.dataloader.load(entities.target.draftId),
  },
  ArticleNewDownstreamNotice: {
    id: ({ uuid }) => uuid,
    target: ({ entities }, _, { dataSources: { draftService } }) =>
      draftService.dataloader.load(entities.target.draftId),
    downstream: ({ entities }, _, { dataSources: { draftService } }) =>
      draftService.dataloader.load(entities.downstream.draftId),
  },
  ArticleNewCollectedNotice: {
    id: ({ uuid }) => uuid,
    actor: ({ actors }: { actors: any[] }) => actors[0],
    target: ({ entities }, _, { dataSources: { draftService } }) =>
      draftService.dataloader.load(entities.target.draftId),
    collection: ({ entities }, _, { dataSources: { draftService } }) =>
      draftService.dataloader.load(entities.collection.draftId),
  },
  ArticleNewAppreciationNotice: {
    id: ({ uuid }) => uuid,
    target: ({ entities }, _, { dataSources: { draftService } }) =>
      draftService.dataloader.load(entities.target.draftId),
  },
  ArticleNewSubscriberNotice: {
    id: ({ uuid }) => uuid,
    target: ({ entities }, _, { dataSources: { draftService } }) =>
      draftService.dataloader.load(entities.target.draftId),
  },
  ArticleNewCommentNotice: {
    id: ({ uuid }) => uuid,
    target: ({ entities }, _, { dataSources: { draftService } }) =>
      draftService.dataloader.load(entities.target.draftId),
    comment: ({ entities }) => entities.comment,
  },
  ArticleMentionedYouNotice: {
    id: ({ uuid }) => uuid,
    actor: ({ actors }: { actors: any[] }) => actors[0],
    target: ({ entities }, _, { dataSources: { draftService } }) =>
      draftService.dataloader.load(entities.target.draftId),
  },
  SubscribedArticleNewCommentNotice: {
    id: ({ uuid }) => uuid,
    target: ({ entities }, _, { dataSources: { draftService } }) =>
      draftService.dataloader.load(entities.target.draftId),
    comment: ({ entities }) => entities.comment,
  },
  UpstreamArticleArchivedNotice: {
    id: ({ uuid }) => uuid,
    target: ({ entities }, _, { dataSources: { draftService } }) =>
      draftService.dataloader.load(entities.target.draftId),
    upstream: ({ entities }, _, { dataSources: { draftService } }) =>
      draftService.dataloader.load(entities.upstream.draftId),
  },
  DownstreamArticleArchivedNotice: {
    id: ({ uuid }) => uuid,
    target: ({ entities }, _, { dataSources: { draftService } }) =>
      draftService.dataloader.load(entities.target.draftId),
    downstream: ({ entities }, _, { dataSources: { draftService } }) =>
      draftService.dataloader.load(entities.downstream.draftId),
  },
  CommentPinnedNotice: {
    id: ({ uuid }) => uuid,
    actor: ({ entities }, _: any, { dataSources: { userService } }) => {
      const target = entities.target
      return userService.dataloader.load(target.authorId)
    },
    target: ({ entities }) => entities.target,
  },
  CommentNewReplyNotice: {
    id: ({ uuid }) => uuid,
    target: ({ entities }) => entities.target,
    reply: ({ entities }) => entities.reply,
  },
  CommentMentionedYouNotice: {
    id: ({ uuid }) => uuid,
    actor: ({ actors }: { actors: any[] }) => actors[0],
    target: ({ entities }) => entities.target,
  },
  OfficialAnnouncementNotice: {
    id: ({ uuid }) => uuid,
    link: ({ data }: { data: any }) => data && data.link,
  },
  ArticleTagHasBeenAddedNotice: {
    id: ({ uuid }) => uuid,
    actor: ({ actors }: { actors: any[] }) => actors[0],
    target: ({ entities }, _, { dataSources: { draftService } }) =>
      draftService.dataloader.load(entities.target.draftId),
    tag: ({ entities }) => entities.tag,
  },
  ArticleTagHasBeenRemovedNotice: {
    id: ({ uuid }) => uuid,
    actor: ({ actors }: { actors: any[] }) => actors[0],
    target: ({ entities }, _, { dataSources: { draftService } }) =>
      draftService.dataloader.load(entities.target.draftId),
    tag: ({ entities }) => entities.tag,
  },
  ArticleTagHasBeenUnselectedNotice: {
    id: ({ uuid }) => uuid,
    actor: ({ actors }: { actors: any[] }) => actors[0],
    target: ({ entities }, _, { dataSources: { draftService } }) =>
      draftService.dataloader.load(entities.target.draftId),
    tag: ({ entities }) => entities.tag,
  },
  PaymentReceivedDonationNotice: {
    id: ({ uuid }) => uuid,
    actor: ({ actors }: { actors: any[] }) => actors[0],
    target: ({ entities }) => entities.target,
  },
  PaymentPayoutNotice: {
    id: ({ uuid }) => uuid,
    target: ({ entities }) => entities.target,
  },
  TagAdoptionNotice: {
    id: ({ uuid }) => uuid,
    actor: ({ actors }: { actors: any[] }) => actors[0],
    tag: ({ entities }) => entities.target,
  },
  TagLeaveNotice: {
    id: ({ uuid }) => uuid,
    actor: ({ actors }: { actors: any[] }) => actors[0],
    tag: ({ entities }) => entities.target,
  },
  TagAddEditorNotice: {
    id: ({ uuid }) => uuid,
    actor: ({ actors }: { actors: any[] }) => actors[0],
    tag: ({ entities }) => entities.target,
  },
  TagLeaveEditorNotice: {
    id: ({ uuid }) => uuid,
    actor: ({ actors }: { actors: any[] }) => actors[0],
    tag: ({ entities }) => entities.target,
  },
  RevisedArticlePublishedNotice: {
    id: ({ uuid }) => uuid,
    target: ({ entities }, _, { dataSources: { draftService } }) =>
      draftService.dataloader.load(entities.target.draftId),
  },
  RevisedArticleNotPublishedNotice: {
    id: ({ uuid }) => uuid,
    target: ({ entities }, _, { dataSources: { draftService } }) =>
      draftService.dataloader.load(entities.target.draftId),
  },
}

export default notice
