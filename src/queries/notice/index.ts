import {
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
  GQLCommentNewUpvoteNoticeTypeResolver,
  GQLCommentPinnedNoticeTypeResolver,
  GQLDownstreamArticleArchivedNoticeTypeResolver,
  GQLNoticeTypeResolver,
  GQLOfficialAnnouncementNoticeTypeResolver,
  GQLSubscribedArticleNewCommentNoticeTypeResolver,
  GQLUpstreamArticleArchivedNoticeTypeResolver,
  GQLUserNewFollowerNoticeTypeResolver,
  GQLUserTypeResolver,
  NoticeType
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
  CommentNewUpvoteNotice: GQLCommentNewUpvoteNoticeTypeResolver
  CommentMentionedYouNotice: GQLCommentMentionedYouNoticeTypeResolver
  OfficialAnnouncementNotice: GQLOfficialAnnouncementNoticeTypeResolver
  ArticleTagHasBeenAddedNotice: GQLArticleTagHasBeenAddedNoticeTypeResolver
  ArticleTagHasBeenRemovedNotice: GQLArticleTagHasBeenRemovedNoticeTypeResolver
  ArticleTagHasBeenUnselectedNotice: GQLArticleTagHasBeenUnselectedNoticeTypeResolver
} = {
  User: {
    notices
  },
  Notice: {
    __resolveType: ({ type }: { type: NoticeType }) => {
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
        // comment
        comment_pinned: 'CommentPinnedNotice',
        comment_new_reply: 'CommentNewReplyNotice',
        comment_new_upvote: 'CommentNewUpvoteNotice',
        comment_mentioned_you: 'CommentMentionedYouNotice',
        // official
        official_announcement: 'OfficialAnnouncementNotice'
      }
      return noticeTypeMap[type]
    }
  },
  UserNewFollowerNotice: {
    id: ({ uuid }) => uuid
  },
  ArticlePublishedNotice: {
    id: ({ uuid }) => uuid,
    target: ({ entities }) => entities.target
  },
  ArticleNewDownstreamNotice: {
    id: ({ uuid }) => uuid,
    target: ({ entities }) => entities.target,
    downstream: ({ entities }) => entities.downstream
  },
  ArticleNewCollectedNotice: {
    id: ({ uuid }) => uuid,
    actor: ({ actors }: { actors: any[] }) => actors[0],
    target: ({ entities }) => entities.target,
    collection: ({ entities }) => entities.collection
  },
  ArticleNewAppreciationNotice: {
    id: ({ uuid }) => uuid,
    target: ({ entities }) => entities.target
  },
  ArticleNewSubscriberNotice: {
    id: ({ uuid }) => uuid,
    target: ({ entities }) => entities.target
  },
  ArticleNewCommentNotice: {
    id: ({ uuid }) => uuid,
    target: ({ entities }) => entities.target,
    comment: ({ entities }) => entities.comment
  },
  ArticleMentionedYouNotice: {
    id: ({ uuid }) => uuid,
    actor: ({ actors }: { actors: any[] }) => actors[0],
    target: ({ entities }) => entities.target
  },
  SubscribedArticleNewCommentNotice: {
    id: ({ uuid }) => uuid,
    target: ({ entities }) => entities.target,
    comment: ({ entities }) => entities.comment
  },
  UpstreamArticleArchivedNotice: {
    id: ({ uuid }) => uuid,
    target: ({ entities }) => entities.target,
    upstream: ({ entities }) => entities.upstream
  },
  DownstreamArticleArchivedNotice: {
    id: ({ uuid }) => uuid,
    target: ({ entities }) => entities.target,
    downstream: ({ entities }) => entities.downstream
  },
  CommentPinnedNotice: {
    id: ({ uuid }) => uuid,
    actor: ({ entities }, _: any, { dataSources: { userService } }) => {
      const target = entities.target
      return userService.dataloader.load(target.authorId)
    },
    target: ({ entities }) => entities.target
  },
  CommentNewReplyNotice: {
    id: ({ uuid }) => uuid,
    target: ({ entities }) => entities.target,
    reply: ({ entities }) => entities.reply
  },
  CommentNewUpvoteNotice: {
    id: ({ uuid }) => uuid,
    target: ({ entities }) => entities.target
  },
  CommentMentionedYouNotice: {
    id: ({ uuid }) => uuid,
    actor: ({ actors }: { actors: any[] }) => actors[0],
    target: ({ entities }) => entities.target
  },
  OfficialAnnouncementNotice: {
    id: ({ uuid }) => uuid,
    link: ({ data }: { data: any }) => data && data.link
  },
  ArticleTagHasBeenAddedNotice: {
    id: ({ uuid }) => uuid,
    actor: ({ actors }: { actors: any[] }) => actors[0],
    target: ({ entities }) => entities.target,
    tag: ({ entities }) => entities.tag
  },
  ArticleTagHasBeenRemovedNotice: {
    id: ({ uuid }) => uuid,
    actor: ({ actors }: { actors: any[] }) => actors[0],
    target: ({ entities }) => entities.target,
    tag: ({ entities }) => entities.tag
  },
  ArticleTagHasBeenUnselectedNotice: {
    id: ({ uuid }) => uuid,
    actor: ({ actors }: { actors: any[] }) => actors[0],
    target: ({ entities }) => entities.target,
    tag: ({ entities }) => entities.tag
  }
}

export default notice
