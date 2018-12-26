import { Context, NoticeType } from 'definitions'
import { toGlobalId } from 'common/utils'

import notices from './notices'

export default {
  User: {
    notices
  },
  Notice: {
    __resolveType: ({ type }: { type: NoticeType }) => {
      const noticeTypeMap = {
        // user
        user_new_follower: 'UserNewFollowerNotice',
        user_disabled: 'UserDisabledNotice',
        // article
        article_published: 'ArticlePublishedNotice',
        article_reported: 'ArticleReportedNotice',
        article_archived: 'ArticleArchivedNotice',
        article_new_downstream: 'ArticleNewDownstreamNotice',
        article_new_appreciation: 'ArticleNewAppreciationNotice',
        article_new_subscriber: 'ArticleNewSubscriberNotice',
        article_new_comment: 'ArticleNewCommentNotice',
        subscribed_article_new_comment: 'SubscribedArticleNewCommentNotice',
        // comment
        comment_pinned: 'CommentPinnedNotice',
        comment_reported: 'CommentReportedNotice',
        comment_archived: 'CommentArchivedNotice',
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
    id: ({ uuid }: { uuid: string }) => uuid
  },
  UserDisabledNotice: {
    id: ({ uuid }: { uuid: string }) => uuid
  },
  ArticlePublishedNotice: {
    id: ({ uuid }: { uuid: string }) => uuid
  },
  ArticleReportedNotice: {
    id: ({ uuid }: { uuid: string }) => uuid,
    reason: ({ data }: { data: any }) => data && data.reason
  },
  ArticleArchivedNotice: {
    id: ({ uuid }: { uuid: string }) => uuid,
    reason: ({ data }: { data: any }) => data && data.reason
  },
  ArticleNewDownstreamNotice: {
    id: ({ uuid }: { uuid: string }) => uuid,
    downstream: ({ entities }: { entities: any }) => {
      return entities['downstream']
    }
  },
  ArticleNewAppreciationNotice: {
    id: ({ uuid }: { uuid: string }) => uuid,
    MAT: (
      { actors, target }: { actors: any[]; target: any },
      _: any,
      { dataSources: { articleService } }: Context
    ) => {
      const actorIds = actors.map(actor => actor.id)
      return articleService.countAppreciationByUserIds(target.id, actorIds)
    }
  },
  ArticleNewSubscriberNotice: {
    id: ({ uuid }: { uuid: string }) => uuid
  },
  ArticleNewCommentNotice: {
    id: ({ uuid }: { uuid: string }) => uuid
  },
  SubscribedArticleNewCommentNotice: {
    id: ({ uuid }: { uuid: string }) => uuid
  },
  CommentPinnedNotice: {
    id: ({ uuid }: { uuid: string }) => uuid
  },
  CommentReportedNotice: {
    id: ({ uuid }: { uuid: string }) => uuid,
    reason: ({ data }: { data: any }) => data && data.reason
  },
  CommentArchivedNotice: {
    id: ({ uuid }: { uuid: string }) => uuid,
    reason: ({ data }: { data: any }) => data && data.reason
  },
  CommentNewReplyNotice: {
    id: ({ uuid }: { uuid: string }) => uuid
  },
  CommentNewUpvoteNotice: {
    id: ({ uuid }: { uuid: string }) => uuid
  },
  CommentMentionedYouNotice: {
    id: ({ uuid }: { uuid: string }) => uuid
  },
  OfficialAnnouncementNotice: {
    id: ({ uuid }: { uuid: string }) => uuid,
    link: ({ data }: { data: any }) => data && data.link
  }
}
