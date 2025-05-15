import type {
  GQLArticleArticleNoticeResolvers,
  GQLArticleNoticeResolvers,
  GQLCircleNoticeResolvers,
  GQLCollectionNoticeResolvers,
  GQLMomentNoticeResolvers,
  GQLCommentCommentNoticeResolvers,
  GQLCommentNoticeResolvers,
  GQLCampaignArticleNoticeResolvers,
  GQLOfficialAnnouncementNoticeResolvers,
  GQLTransactionNoticeResolvers,
  GQLUserNoticeResolvers,
  GQLNoticeResolvers,
  GQLUserResolvers,
} from '#definitions/index.js'

import {
  NOTICE_TYPE as INNER_NOTICE_TYPE,
  NODE_TYPES,
} from '#common/enums/index.js'
import { ServerError } from '#common/errors.js'
import { toGlobalId } from '#common/utils/index.js'

import notices from './notices.js'

const NOTICE_TYPE = {
  UserNotice: 'UserNotice',
  ArticleNotice: 'ArticleNotice',
  ArticleArticleNotice: 'ArticleArticleNotice',
  CollectionNotice: 'CollectionNotice',
  MomentNotice: 'MomentNotice',
  CommentNotice: 'CommentNotice',
  CommentCommentNotice: 'CommentCommentNotice',
  CampaignArticleNotice: 'CampaignArticleNotice',
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
  CollectionNotice: GQLCollectionNoticeResolvers
  MomentNotice: GQLMomentNoticeResolvers
  CommentNotice: GQLCommentNoticeResolvers
  CommentCommentNotice: GQLCommentCommentNoticeResolvers
  CampaignArticleNotice: GQLCampaignArticleNoticeResolvers
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
        scheduled_article_published: NOTICE_TYPE.ArticleNotice,
        scheduled_article_published_with_collections_failure:
          NOTICE_TYPE.ArticleNotice,
        scheduled_article_published_with_campaigns_failure:
          NOTICE_TYPE.ArticleNotice,
        scheduled_article_published_with_connections_failure:
          NOTICE_TYPE.ArticleNotice,
        article_new_appreciation: NOTICE_TYPE.ArticleNotice,
        article_new_subscriber: NOTICE_TYPE.ArticleNotice,
        article_mentioned_you: NOTICE_TYPE.ArticleNotice,
        revised_article_published: NOTICE_TYPE.ArticleNotice,
        revised_article_not_published: NOTICE_TYPE.ArticleNotice,
        circle_new_article: NOTICE_TYPE.ArticleNotice, // deprecated

        // article-article
        article_new_collected: NOTICE_TYPE.ArticleArticleNotice,

        // collection
        collection_liked: NOTICE_TYPE.CollectionNotice,

        // moment
        moment_liked: NOTICE_TYPE.MomentNotice,
        moment_mentioned_you: NOTICE_TYPE.MomentNotice,

        // comment
        comment_pinned: NOTICE_TYPE.CommentNotice,
        article_comment_liked: NOTICE_TYPE.CommentNotice,
        moment_comment_liked: NOTICE_TYPE.CommentNotice,
        article_comment_mentioned_you: NOTICE_TYPE.CommentNotice,
        moment_comment_mentioned_you: NOTICE_TYPE.CommentNotice,
        article_new_comment: NOTICE_TYPE.CommentNotice,
        moment_new_comment: NOTICE_TYPE.CommentNotice,
        circle_new_broadcast: NOTICE_TYPE.CommentNotice,

        // comment-comment
        comment_new_reply: NOTICE_TYPE.CommentCommentNotice,

        // campaign-article
        campaign_article_featured: NOTICE_TYPE.CampaignArticleNotice,

        // transaction
        payment_received_donation: NOTICE_TYPE.TransactionNotice,
        withdrew_locked_tokens: NOTICE_TYPE.TransactionNotice,

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
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.Notice, id }),
    type: ({ type }) => {
      switch (type) {
        case INNER_NOTICE_TYPE.user_new_follower:
          return 'UserNewFollower'
      }
      throw new ServerError(`Unknown UserNotice type: ${type}`)
    },
    target: ({ type }, _, { viewer }) => {
      if (type === INNER_NOTICE_TYPE.user_new_follower) {
        return viewer
      }
      return null
    },
  },
  ArticleNotice: {
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.Notice, id }),
    type: ({ type }) => {
      switch (type) {
        case INNER_NOTICE_TYPE.article_published:
          return 'ArticlePublished'
        case INNER_NOTICE_TYPE.scheduled_article_published:
          return 'ScheduledArticlePublished'
        case INNER_NOTICE_TYPE.scheduled_article_published_with_collections_failure:
          return 'ScheduledArticlePublishedWithCollectionsFailure'
        case INNER_NOTICE_TYPE.scheduled_article_published_with_campaigns_failure:
          return 'ScheduledArticlePublishedWithCampaignsFailure'
        case INNER_NOTICE_TYPE.scheduled_article_published_with_connections_failure:
          return 'ScheduledArticlePublishedWithConnectionsFailure'
        case INNER_NOTICE_TYPE.article_new_appreciation:
          return 'ArticleNewAppreciation'
        case INNER_NOTICE_TYPE.article_new_subscriber:
          return 'ArticleNewSubscriber'
        case INNER_NOTICE_TYPE.article_mentioned_you:
          return 'ArticleMentionedYou'
        case INNER_NOTICE_TYPE.revised_article_published:
          return 'RevisedArticlePublished'
        case INNER_NOTICE_TYPE.revised_article_not_published:
          return 'RevisedArticleNotPublished'
        case INNER_NOTICE_TYPE.circle_new_article:
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
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.Notice, id }),
    type: ({ type }) => {
      switch (type) {
        case INNER_NOTICE_TYPE.article_new_collected:
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
      if (type === INNER_NOTICE_TYPE.article_new_collected) {
        if (!entities) {
          throw new ServerError('entities is empty')
        }
        return atomService.articleIdLoader.load(entities.collection.id)
      }
      throw new ServerError(`Unknown ArticleArticleNotice type: ${type}`)
    },
  },
  CollectionNotice: {
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.Notice, id }),
    target: ({ entities, type }) => {
      if (!entities) {
        throw new ServerError('entities is empty')
      }
      switch (type) {
        case INNER_NOTICE_TYPE.collection_liked:
          return entities.target
      }
      throw new ServerError(`Unknown MomentNotice type: ${type}`)
    },
  },
  MomentNotice: {
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.Notice, id }),
    type: ({ type }) => {
      switch (type) {
        case INNER_NOTICE_TYPE.moment_liked:
          return 'MomentLiked'
        case INNER_NOTICE_TYPE.moment_mentioned_you:
          return 'MomentMentionedYou'
      }
      throw new ServerError(`Unknown MomentNotice type: ${type}`)
    },
    target: ({ entities, type }) => {
      if (!entities) {
        throw new ServerError('entities is empty')
      }
      switch (type) {
        case INNER_NOTICE_TYPE.moment_liked:
        case INNER_NOTICE_TYPE.moment_mentioned_you:
          return entities.target
      }
      throw new ServerError(`Unknown MomentNotice type: ${type}`)
    },
  },
  CommentNotice: {
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.Notice, id }),
    type: ({ type }) => {
      switch (type) {
        case INNER_NOTICE_TYPE.article_comment_liked:
        case INNER_NOTICE_TYPE.moment_comment_liked:
          return 'CommentLiked'
        case INNER_NOTICE_TYPE.article_comment_mentioned_you:
        case INNER_NOTICE_TYPE.moment_comment_mentioned_you:
          return 'CommentMentionedYou'
        case INNER_NOTICE_TYPE.article_new_comment:
          return 'ArticleNewComment'
        case INNER_NOTICE_TYPE.moment_new_comment:
          return 'MomentNewComment'
        case INNER_NOTICE_TYPE.circle_new_broadcast: // deprecated
          return 'CircleNewBroadcast'
      }
      throw new ServerError(`Unknown CommentNotice type: ${type}`)
    },
    target: ({ entities, type }) => {
      if (!entities) {
        throw new ServerError('entities is empty')
      }
      switch (type) {
        case INNER_NOTICE_TYPE.article_comment_liked:
        case INNER_NOTICE_TYPE.article_comment_mentioned_you:
        case INNER_NOTICE_TYPE.circle_new_broadcast: // deprecated
        case INNER_NOTICE_TYPE.moment_comment_liked:
        case INNER_NOTICE_TYPE.moment_comment_mentioned_you:
          return entities.target
        case INNER_NOTICE_TYPE.article_new_comment:
        case INNER_NOTICE_TYPE.moment_new_comment:
          return entities.comment
      }
      throw new ServerError(`Unknown CommentNotice type: ${type}`)
    },
  },
  CommentCommentNotice: {
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.Notice, id }),
    type: ({ type }) => {
      switch (type) {
        case INNER_NOTICE_TYPE.comment_new_reply:
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
        case INNER_NOTICE_TYPE.comment_new_reply:
          return entities.reply
      }
      throw new ServerError(`Unknown CommentCommentNotice type: ${type}`)
    },
  },
  CampaignArticleNotice: {
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.Notice, id }),
    type: ({ type }) => {
      switch (type) {
        case INNER_NOTICE_TYPE.campaign_article_featured:
          return 'CampaignArticleFeatured'
      }
      throw new ServerError(`Unknown CampaignArticleNotice type: ${type}`)
    },
    target: ({ entities }, _, { dataSources: { atomService } }) => {
      if (!entities) {
        throw new ServerError('entities is empty')
      }
      return atomService.campaignIdLoader.load(entities.target.id)
    },
    article: ({ entities }, _, { dataSources: { atomService } }) => {
      if (!entities) {
        throw new ServerError('entities is empty')
      }
      return atomService.articleIdLoader.load(entities.article.id)
    },
  },
  TransactionNotice: {
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.Notice, id }),
    type: ({ type }) => {
      switch (type) {
        case INNER_NOTICE_TYPE.payment_received_donation:
          return 'PaymentReceivedDonation'
        case INNER_NOTICE_TYPE.withdrew_locked_tokens:
          return 'WithdrewLockedTokens'
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
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.Notice, id }),
    type: ({ type }) => {
      switch (type) {
        case INNER_NOTICE_TYPE.circle_invitation:
          return 'CircleInvitation'
        case INNER_NOTICE_TYPE.circle_new_subscriber:
          return 'CircleNewSubscriber'
        case INNER_NOTICE_TYPE.circle_new_follower:
          return 'CircleNewFollower'
        case INNER_NOTICE_TYPE.circle_new_unsubscriber:
          return 'CircleNewUnsubscriber'
        case INNER_NOTICE_TYPE.circle_new_broadcast_comments:
          return 'CircleNewBroadcastComments'
        case INNER_NOTICE_TYPE.circle_new_discussion_comments:
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
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.Notice, id }),
    link: ({ data }) => (data && data.link) ?? null,
  },
}

export default notice
