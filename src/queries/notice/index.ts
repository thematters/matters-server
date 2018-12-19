import { BatchParams, Context, NoticeType } from 'definitions'
import { toGlobalId } from 'common/utils'

export default {
  User: {
    notices: (
      { id }: { id: string },
      { input: { offset, limit } }: BatchParams,
      { userService }: Context
    ) => userService.findNoticesInBatch(id, offset, limit)
  },
  UserStatus: {
    unreadNoticeCount: (
      { id }: { id: string },
      _: any,
      { userService }: Context
    ) => userService.countUnreadNotice(id)
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
        comment_new_reply: 'CommentnewReplyNotice',
        comment_new_upvote: 'CommentNewUpvoteNotice',
        comment_mentioned_you: 'CommentMentionedYouNotice',
        // official
        official_announcement: 'OfficialAnnouncementNotice'
      }
      return noticeTypeMap[type]
    },
    id: ({ id }: { id: string }) => {
      return toGlobalId({ type: 'Notice', id })
    }
  },
  ArticleReportedNotice: {
    reason: ({ data }: { data: any }) => data.reason
  },
  ArticleArchivedNotice: {
    reason: ({ data }: { data: any }) => data.reason
  },
  ArticleNewDownstreamNotice: {
    downstream: ({ entities }: { entities: any }) => {
      return entities['downstream']
    }
  },
  ArticleNewAppreciationNotice: {
    MAT: (
      { actors, target }: { actors: any[]; target: any },
      _: any,
      { articleService }: Context
    ) => {
      const actorIds = actors.map(actor => actor.id)
      console.log(target, actorIds)
      return articleService.countAppreciationByUserIds(target.id, actorIds)
    }
  },
  CommentArchivedNotice: {
    reason: ({ data }: { data: any }) => data.reason
  },
  CommentReportedNotice: {
    reason: ({ data }: { data: any }) => data.reason
  }
}
