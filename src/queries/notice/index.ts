import { DB_NOTICE_TYPE } from 'common/enums'
import {
  DBNoticeType,
  GQLArticleArticleNoticeType,
  GQLArticleArticleNoticeTypeResolver,
  GQLArticleNoticeType,
  GQLArticleNoticeTypeResolver,
  GQLArticleTagNoticeType,
  GQLArticleTagNoticeTypeResolver,
  GQLCircleArticleNoticeType,
  GQLCircleArticleNoticeTypeResolver,
  GQLCircleCommentNoticeType,
  GQLCircleCommentNoticeTypeResolver,
  GQLCircleNoticeType,
  GQLCircleNoticeTypeResolver,
  GQLCommentCommentNoticeType,
  GQLCommentCommentNoticeTypeResolver,
  GQLCommentNoticeType,
  GQLCommentNoticeTypeResolver,
  GQLCryptoNoticeType,
  GQLCryptoNoticeTypeResolver,
  GQLOfficialAnnouncementNoticeTypeResolver,
  GQLTagNoticeType,
  GQLTagNoticeTypeResolver,
  GQLTransactionNoticeType,
  GQLTransactionNoticeTypeResolver,
  GQLUserNoticeType,
  GQLUserNoticeTypeResolver,
  GQLUserTypeResolver,
} from 'definitions'

import notices from './notices'

enum NOTICE_TYPE {
  UserNotice = 'UserNotice',
  ArticleNotice = 'ArticleNotice',
  ArticleArticleNotice = 'ArticleArticleNotice',
  CommentNotice = 'CommentNotice',
  CommentCommentNotice = 'CommentCommentNotice',
  ArticleTagNotice = 'ArticleTagNotice',
  TagNotice = 'TagNotice',
  TransactionNotice = 'TransactionNotice',
  CircleNotice = 'CircleNotice',
  CircleArticleNotice = 'CircleArticleNotice',
  CircleCommentNotice = 'CircleCommentNotice',
  CryptoNotice = 'CryptoNotice',
  OfficialAnnouncementNotice = 'OfficialAnnouncementNotice',
}

const notice: {
  User: GQLUserTypeResolver
  Notice: any
  UserNotice: GQLUserNoticeTypeResolver
  ArticleNotice: GQLArticleNoticeTypeResolver
  ArticleArticleNotice: GQLArticleArticleNoticeTypeResolver
  ArticleTagNotice: GQLArticleTagNoticeTypeResolver
  TagNotice: GQLTagNoticeTypeResolver
  CommentNotice: GQLCommentNoticeTypeResolver
  CommentCommentNotice: GQLCommentCommentNoticeTypeResolver
  TransactionNotice: GQLTransactionNoticeTypeResolver
  CircleNotice: GQLCircleNoticeTypeResolver
  CircleArticleNotice: GQLCircleArticleNoticeTypeResolver
  CircleCommentNotice: GQLCircleCommentNoticeTypeResolver
  CryptoNotice: GQLCryptoNoticeTypeResolver
  OfficialAnnouncementNotice: GQLOfficialAnnouncementNoticeTypeResolver
} = {
  User: { notices },
  Notice: {
    __resolveType: ({ type }: { type: DBNoticeType }) => {
      const noticeTypeMap: Record<DBNoticeType, NOTICE_TYPE> = {
        // user
        user_new_follower: NOTICE_TYPE.UserNotice,

        // article
        article_published: NOTICE_TYPE.ArticleNotice,
        article_new_appreciation: NOTICE_TYPE.ArticleNotice,
        article_new_subscriber: NOTICE_TYPE.ArticleNotice,
        article_mentioned_you: NOTICE_TYPE.ArticleNotice,
        revised_article_published: NOTICE_TYPE.ArticleNotice,
        revised_article_not_published: NOTICE_TYPE.ArticleNotice,
        circle_new_article: NOTICE_TYPE.ArticleNotice, // deprecated

        // article-artilce
        article_new_collected: NOTICE_TYPE.ArticleArticleNotice,

        // article-tag
        article_tag_has_been_added: NOTICE_TYPE.ArticleTagNotice,
        article_tag_has_been_removed: NOTICE_TYPE.ArticleTagNotice,
        article_tag_has_been_unselected: NOTICE_TYPE.ArticleTagNotice,

        // tag
        tag_adoption: NOTICE_TYPE.TagNotice,
        tag_leave: NOTICE_TYPE.TagNotice,
        tag_add_editor: NOTICE_TYPE.TagNotice,
        tag_leave_editor: NOTICE_TYPE.TagNotice,

        // comment
        comment_pinned: NOTICE_TYPE.CommentNotice,
        comment_mentioned_you: NOTICE_TYPE.CommentNotice,
        article_new_comment: NOTICE_TYPE.CommentNotice,
        subscribed_article_new_comment: NOTICE_TYPE.CommentNotice,
        circle_new_broadcast: NOTICE_TYPE.CommentNotice, // deprecated
        circle_broadcast_mentioned_you: NOTICE_TYPE.CommentNotice,
        circle_discussion_mentioned_you: NOTICE_TYPE.CommentNotice,

        // comment-comment
        comment_new_reply: NOTICE_TYPE.CommentCommentNotice,

        // transaction
        payment_received_donation: NOTICE_TYPE.TransactionNotice,
        payment_payout: NOTICE_TYPE.TransactionNotice,

        // circle
        circle_invitation: NOTICE_TYPE.CircleNotice,

        // for circle owners
        circle_new_subscriber: NOTICE_TYPE.CircleNotice,
        circle_new_unsubscriber: NOTICE_TYPE.CircleNotice,
        circle_new_follower: NOTICE_TYPE.CircleNotice,
        circle_member_new_discussion: NOTICE_TYPE.CircleNotice,
        circle_member_new_discussion_reply: NOTICE_TYPE.CircleNotice,
        circle_member_new_broadcast_reply: NOTICE_TYPE.CircleNotice,

        // for circle members & followers
        in_circle_new_article: NOTICE_TYPE.CircleArticleNotice,
        in_circle_new_broadcast: NOTICE_TYPE.CircleCommentNotice,
        in_circle_new_broadcast_reply: NOTICE_TYPE.CircleNotice,
        in_circle_new_discussion: NOTICE_TYPE.CircleNotice,
        in_circle_new_discussion_reply: NOTICE_TYPE.CircleNotice,

        // crypto
        crypto_wallet_airdrop: NOTICE_TYPE.CryptoNotice,
        crypto_wallet_connected: NOTICE_TYPE.CryptoNotice,

        // official
        official_announcement: NOTICE_TYPE.OfficialAnnouncementNotice,
      }

      return noticeTypeMap[type]
    },
  },
  UserNotice: {
    type: ({ type }) => {
      switch (type) {
        case DB_NOTICE_TYPE.user_new_follower:
          return GQLUserNoticeType.UserNewFollower
      }
    },
    target: ({ entities, type }, _, { viewer }) => {
      if (type === DB_NOTICE_TYPE.user_new_follower) {
        return viewer
      }
      return null
    },
  },
  ArticleNotice: {
    type: ({ type }) => {
      switch (type) {
        case DB_NOTICE_TYPE.article_published:
          return GQLArticleNoticeType.ArticlePublished
        case DB_NOTICE_TYPE.article_new_appreciation:
          return GQLArticleNoticeType.ArticleNewAppreciation
        case DB_NOTICE_TYPE.article_new_subscriber:
          return GQLArticleNoticeType.ArticleNewSubscriber
        case DB_NOTICE_TYPE.article_mentioned_you:
          return GQLArticleNoticeType.ArticleMentionedYou
        case DB_NOTICE_TYPE.revised_article_published:
          return GQLArticleNoticeType.RevisedArticlePublished
        case DB_NOTICE_TYPE.revised_article_not_published:
          return GQLArticleNoticeType.RevisedArticleNotPublished
        case DB_NOTICE_TYPE.circle_new_article:
          return GQLArticleNoticeType.CircleNewArticle
      }
    },
    target: ({ entities }, _, { dataSources: { draftService } }) =>
      draftService.dataloader.load(entities.target.draftId),
  },
  ArticleArticleNotice: {
    type: ({ type }) => {
      switch (type) {
        case DB_NOTICE_TYPE.article_new_collected:
          return GQLArticleArticleNoticeType.ArticleNewCollected
      }
    },
    target: ({ entities }, _, { dataSources: { draftService } }) =>
      draftService.dataloader.load(entities.target.draftId),
    article: ({ entities, type }, _, { dataSources: { draftService } }) => {
      if (type === DB_NOTICE_TYPE.article_new_collected) {
        return draftService.dataloader.load(entities.collection.draftId)
      }
      return null
    },
  },
  ArticleTagNotice: {
    type: ({ type }) => {
      switch (type) {
        case DB_NOTICE_TYPE.article_tag_has_been_added:
          return GQLArticleTagNoticeType.ArticleTagAdded
        case DB_NOTICE_TYPE.article_tag_has_been_removed:
          return GQLArticleTagNoticeType.ArticleTagRemoved
      }
    },
    target: ({ entities }, _, { dataSources: { draftService } }) =>
      draftService.dataloader.load(entities.target.draftId),
    tag: ({ entities }) => entities.tag,
  },
  TagNotice: {
    type: ({ type }) => {
      switch (type) {
        case DB_NOTICE_TYPE.tag_adoption:
          return GQLTagNoticeType.TagAdoption
        case DB_NOTICE_TYPE.tag_leave:
          return GQLTagNoticeType.TagLeave
        case DB_NOTICE_TYPE.tag_add_editor:
          return GQLTagNoticeType.TagAddEditor
        case DB_NOTICE_TYPE.tag_leave_editor:
          return GQLTagNoticeType.TagAddEditor
      }
    },
    target: ({ entities }) => entities.target,
  },
  CommentNotice: {
    type: ({ type }) => {
      switch (type) {
        case DB_NOTICE_TYPE.comment_pinned:
          return GQLCommentNoticeType.CommentPinned
        case DB_NOTICE_TYPE.comment_mentioned_you:
          return GQLCommentNoticeType.CommentMentionedYou
        case DB_NOTICE_TYPE.article_new_comment:
          return GQLCommentNoticeType.ArticleNewComment
        case DB_NOTICE_TYPE.subscribed_article_new_comment:
          return GQLCommentNoticeType.SubscribedArticleNewComment
        case DB_NOTICE_TYPE.circle_new_broadcast: // deprecated
          return GQLCommentNoticeType.CircleNewBroadcast
        case DB_NOTICE_TYPE.circle_broadcast_mentioned_you:
          return GQLCommentNoticeType.CircleBroadcastMentionedYou
        case DB_NOTICE_TYPE.circle_discussion_mentioned_you:
          return GQLCommentNoticeType.CircleDiscussionMentionedYou
      }
    },
    target: ({ entities, type }) => {
      switch (type) {
        case DB_NOTICE_TYPE.comment_pinned:
        case DB_NOTICE_TYPE.comment_mentioned_you:
        case DB_NOTICE_TYPE.circle_broadcast_mentioned_you:
        case DB_NOTICE_TYPE.circle_discussion_mentioned_you:
        case DB_NOTICE_TYPE.circle_new_broadcast: // deprecated
          return entities.target
        case DB_NOTICE_TYPE.article_new_comment:
        case DB_NOTICE_TYPE.subscribed_article_new_comment:
          return entities.comment
      }
    },
  },
  CommentCommentNotice: {
    type: ({ type }) => {
      switch (type) {
        case DB_NOTICE_TYPE.comment_new_reply:
          return GQLCommentCommentNoticeType.CommentNewReply
      }
    },
    target: ({ entities }) => entities.target,
    comment: ({ entities, type }) => {
      switch (type) {
        case DB_NOTICE_TYPE.comment_new_reply:
          return entities.reply
      }
    },
  },
  TransactionNotice: {
    type: ({ type }) => {
      switch (type) {
        case DB_NOTICE_TYPE.payment_received_donation:
          return GQLTransactionNoticeType.PaymentReceivedDonation
        case DB_NOTICE_TYPE.payment_payout:
          return GQLTransactionNoticeType.PaymentPayout
      }
    },
    target: ({ entities }) => entities.target,
  },
  CircleNotice: {
    type: ({ type }) => {
      switch (type) {
        case DB_NOTICE_TYPE.circle_invitation:
          return GQLCircleNoticeType.CircleInvitation

        // for circle owner
        case DB_NOTICE_TYPE.circle_new_subscriber:
          return GQLCircleNoticeType.CircleNewSubscriber
        case DB_NOTICE_TYPE.circle_new_follower:
          return GQLCircleNoticeType.CircleNewFollower
        case DB_NOTICE_TYPE.circle_new_unsubscriber:
          return GQLCircleNoticeType.CircleNewUnsubscriber
        case DB_NOTICE_TYPE.circle_member_new_broadcast_reply:
          return GQLCircleNoticeType.CircleMemberNewBroadcastReply
        case DB_NOTICE_TYPE.circle_member_new_discussion:
          return GQLCircleNoticeType.CircleMemberNewDiscussion
        case DB_NOTICE_TYPE.circle_member_new_discussion_reply:
          return GQLCircleNoticeType.CircleMemberNewDiscussionReply

        // for circle members & followers
        case DB_NOTICE_TYPE.in_circle_new_broadcast_reply:
          return GQLCircleNoticeType.InCircleNewBroadcastReply
        case DB_NOTICE_TYPE.in_circle_new_discussion:
          return GQLCircleNoticeType.InCircleNewDiscussion
        case DB_NOTICE_TYPE.in_circle_new_discussion_reply:
          return GQLCircleNoticeType.InCircleNewDiscussionReply
      }
    },
    target: ({ entities }) => entities.target,
  },
  CircleCommentNotice: {
    type: ({ type }) => {
      switch (type) {
        case DB_NOTICE_TYPE.in_circle_new_broadcast:
          return GQLCircleCommentNoticeType.InCircleNewBroadcast
      }
    },
    target: ({ entities, type }) => entities.target,
    comment: ({ entities, type }) => entities.comment,
  },
  CircleArticleNotice: {
    type: ({ type }) => {
      switch (type) {
        case DB_NOTICE_TYPE.in_circle_new_article:
          return GQLCircleArticleNoticeType.InCircleNewArticle
      }
    },
    target: ({ entities, type }) => entities.target,
    article: ({ entities, type }, _, { dataSources: { draftService } }) =>
      draftService.dataloader.load(entities.article.draftId),
  },
  CryptoNotice: {
    type: ({ type }) => {
      switch (type) {
        case DB_NOTICE_TYPE.crypto_wallet_airdrop:
          return GQLCryptoNoticeType.CryptoWalletAirdrop
        case DB_NOTICE_TYPE.crypto_wallet_connected:
          return GQLCryptoNoticeType.CryptoWalletConnected
      }
    },
    target: ({ entities }) => entities.target,
  },
  OfficialAnnouncementNotice: {
    link: ({ data }: { data: any }) => data && data.link,
  },
}

export default notice
