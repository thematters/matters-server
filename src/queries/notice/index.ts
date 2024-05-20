import type {
  GQLArticleArticleNoticeResolvers,
  GQLArticleNoticeResolvers,
  GQLCircleNoticeResolvers,
  GQLCommentCommentNoticeResolvers,
  GQLCommentNoticeResolvers,
  GQLOfficialAnnouncementNoticeResolvers,
  GQLTransactionNoticeResolvers,
  GQLUserNoticeResolvers,
  GQLNoticeResolvers,
  GQLUserResolvers,
} from 'definitions'

import { DB_NOTICE_TYPE, NODE_TYPES } from 'common/enums'
import { ServerError } from 'common/errors'

import notices from './notices'

const NOTICE_TYPE = {
  UserNotice: 'UserNotice',
  ArticleNotice: 'ArticleNotice',
  ArticleArticleNotice: 'ArticleArticleNotice',
  CommentNotice: 'CommentNotice',
  CommentCommentNotice: 'CommentCommentNotice',
  TransactionNotice: 'TransactionNotice',
  CircleNotice: 'CircleNotice',
  CircleArticleNotice: 'CircleArticleNotice',
  CircleCommentNotice: 'CircleCommentNotice',
  OfficialAnnouncementNotice: 'OfficialAnnouncementNotice',
} as const

const notice: {
  User: GQLUserResolvers
  Notice: GQLNoticeResolvers
  UserNotice: GQLUserNoticeResolvers
  ArticleNotice: GQLArticleNoticeResolvers
  ArticleArticleNotice: GQLArticleArticleNoticeResolvers
  CommentNotice: GQLCommentNoticeResolvers
  CommentCommentNotice: GQLCommentCommentNoticeResolvers
  TransactionNotice: GQLTransactionNoticeResolvers
  CircleNotice: GQLCircleNoticeResolvers
  OfficialAnnouncementNotice: GQLOfficialAnnouncementNoticeResolvers
} = {
  User: { notices },
  Notice: {
    __resolveType: ({ type }) => {
      const noticeTypeMap = {
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

        // article-article
        article_new_collected: NOTICE_TYPE.ArticleArticleNotice,

        // comment
        comment_pinned: NOTICE_TYPE.CommentNotice,
        comment_mentioned_you: NOTICE_TYPE.CommentNotice,
        article_new_comment: NOTICE_TYPE.CommentNotice,
        circle_new_broadcast: NOTICE_TYPE.CommentNotice,

        // comment-comment
        comment_new_reply: NOTICE_TYPE.CommentCommentNotice,

        // transaction
        payment_received_donation: NOTICE_TYPE.TransactionNotice,

        // circle
        circle_invitation: NOTICE_TYPE.CircleNotice,
        circle_new_subscriber: NOTICE_TYPE.CircleNotice,
        circle_new_unsubscriber: NOTICE_TYPE.CircleNotice,
        circle_new_follower: NOTICE_TYPE.CircleNotice,
        circle_new_broadcast_comments: NOTICE_TYPE.CircleNotice,
        circle_new_discussion_comments: NOTICE_TYPE.CircleNotice,

        // official
        official_announcement: NOTICE_TYPE.OfficialAnnouncementNotice,
      } as const

      return noticeTypeMap[type]
    },
  },
  UserNotice: {
    type: ({ type }) => {
      switch (type) {
        case DB_NOTICE_TYPE.user_new_follower:
          return 'UserNewFollower'
      }
      throw new ServerError(`Unknown UserNotice type: ${type}`)
    },
    target: ({ type }, _, { viewer }) => {
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
          return 'ArticlePublished'
        case DB_NOTICE_TYPE.article_new_appreciation:
          return 'ArticleNewAppreciation'
        case DB_NOTICE_TYPE.article_new_subscriber:
          return 'ArticleNewSubscriber'
        case DB_NOTICE_TYPE.article_mentioned_you:
          return 'ArticleMentionedYou'
        case DB_NOTICE_TYPE.revised_article_published:
          return 'RevisedArticlePublished'
        case DB_NOTICE_TYPE.revised_article_not_published:
          return 'RevisedArticleNotPublished'
        case DB_NOTICE_TYPE.circle_new_article:
          return 'CircleNewArticle'
      }
      throw new ServerError(`Unknown ArticleNotice type: ${type}`)
    },
    target: ({ entities }, _, { dataSources: { atomService } }) => {
      if (!entities) {
        throw new ServerError('entities is empty')
      }
      return atomService.articleIdLoader.load(entities.target.id)
    },
  },
  ArticleArticleNotice: {
    type: ({ type }) => {
      switch (type) {
        case DB_NOTICE_TYPE.article_new_collected:
          return 'ArticleNewCollected'
      }
      throw new ServerError(`Unknown ArticleArticleNotice type: ${type}`)
    },
    target: ({ entities }, _, { dataSources: { atomService } }) => {
      if (!entities) {
        throw new ServerError('entities is empty')
      }
      return atomService.articleIdLoader.load(entities.target.id)
    },
    article: ({ entities, type }, _, { dataSources: { atomService } }) => {
      if (type === DB_NOTICE_TYPE.article_new_collected) {
        if (!entities) {
          throw new ServerError('entities is empty')
        }
        return atomService.articleIdLoader.load(entities.collection.id)
      }
      throw new ServerError(`Unknown ArticleArticleNotice type: ${type}`)
    },
  },

  CommentNotice: {
    type: ({ type }) => {
      switch (type) {
        case DB_NOTICE_TYPE.comment_pinned:
          return 'CommentPinned'
        case DB_NOTICE_TYPE.comment_mentioned_you:
          return 'CommentMentionedYou'
        case DB_NOTICE_TYPE.article_new_comment:
          return 'ArticleNewComment'
        case DB_NOTICE_TYPE.circle_new_broadcast: // deprecated
          return 'CircleNewBroadcast'
      }
      throw new ServerError(`Unknown CommentNotice type: ${type}`)
    },
    target: ({ entities, type }) => {
      if (!entities) {
        throw new ServerError('entities is empty')
      }
      switch (type) {
        case DB_NOTICE_TYPE.comment_pinned:
        case DB_NOTICE_TYPE.comment_mentioned_you:
        case DB_NOTICE_TYPE.circle_new_broadcast: // deprecated
          return entities.target
        case DB_NOTICE_TYPE.article_new_comment:
          return entities.comment
      }
      throw new ServerError(`Unknown CommentNotice type: ${type}`)
    },
  },
  CommentCommentNotice: {
    type: ({ type }) => {
      switch (type) {
        case DB_NOTICE_TYPE.comment_new_reply:
          return 'CommentNewReply'
      }
      throw new ServerError(`Unknown CommentCommentNotice type: ${type}`)
    },
    target: ({ entities }) => {
      if (!entities) {
        throw new ServerError('entities is empty')
      }
      return entities.target
    },
    comment: ({ entities, type }) => {
      if (!entities) {
        throw new ServerError('entities is empty')
      }
      switch (type) {
        case DB_NOTICE_TYPE.comment_new_reply:
          return entities.reply
      }
      throw new ServerError(`Unknown CommentCommentNotice type: ${type}`)
    },
  },
  TransactionNotice: {
    type: ({ type }) => {
      switch (type) {
        case DB_NOTICE_TYPE.payment_received_donation:
          return 'PaymentReceivedDonation'
      }
      throw new ServerError(`Unknown TransactionNotice type: ${type}`)
    },
    target: ({ entities }) => {
      if (!entities) {
        throw new ServerError('entities is empty')
      }
      return entities.target
    },
  },
  CircleNotice: {
    type: ({ type }) => {
      switch (type) {
        case DB_NOTICE_TYPE.circle_invitation:
          return 'CircleInvitation'
        case DB_NOTICE_TYPE.circle_new_subscriber:
          return 'CircleNewSubscriber'
        case DB_NOTICE_TYPE.circle_new_follower:
          return 'CircleNewFollower'
        case DB_NOTICE_TYPE.circle_new_unsubscriber:
          return 'CircleNewUnsubscriber'
        case DB_NOTICE_TYPE.circle_new_broadcast_comments:
          return 'CircleNewBroadcastComments'
        case DB_NOTICE_TYPE.circle_new_discussion_comments:
          return 'CircleNewDiscussionComments'
      }
      throw new ServerError(`Unknown CircleNotice type: ${type}`)
    },
    target: ({ entities }) => {
      if (!entities) {
        throw new ServerError('entities is empty')
      }
      return entities.target
    },
    comments: async ({ data }, _, { dataSources: { atomService } }) => {
      const { comments } = data || {}

      if (!comments || comments.length <= 0) {
        return null
      }

      return (await atomService.commentIdLoader.loadMany(comments)).map(
        (c) => ({
          ...c,
          __typename: NODE_TYPES.Comment,
        })
      )
    },
    replies: async ({ data }, _, { dataSources: { atomService } }) => {
      const { replies } = data || {}

      if (!replies || replies.length <= 0) {
        return null
      }

      return (await atomService.commentIdLoader.loadMany(replies)).map((c) => ({
        ...c,
        __typename: NODE_TYPES.Comment,
      }))
    },
    mentions: async ({ data }, _, { dataSources: { atomService } }) => {
      const { mentions } = data || {}

      if (!mentions || mentions.length <= 0) {
        return null
      }

      return (await atomService.commentIdLoader.loadMany(mentions)).map(
        (c) => ({
          ...c,
          __typename: NODE_TYPES.Comment,
        })
      )
    },
  },
  OfficialAnnouncementNotice: {
    link: ({ data }) => (data && data.link) ?? null,
  },
}

export default notice
