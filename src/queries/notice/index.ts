import { Context, NoticeType } from 'definitions'

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
    id: ({ uuid }: { uuid: string }) => uuid
  },
  ArticlePublishedNotice: {
    id: ({ uuid }: { uuid: string }) => uuid,
    target: ({ entities }: { entities: any }) => entities['target']
  },
  ArticleNewDownstreamNotice: {
    id: ({ uuid }: { uuid: string }) => uuid,
    target: ({ entities }: { entities: any }) => entities['target'],
    downstream: ({ entities }: { entities: any }) => entities['downstream']
  },
  ArticleNewCollectedNotice: {
    id: ({ uuid }: { uuid: string }) => uuid,
    actor: ({ actors }: { actors: any[] }) => actors[0],
    target: ({ entities }: { entities: any }) => entities['target'],
    collection: ({ entities }: { entities: any }) => entities['collection']
  },
  ArticleNewAppreciationNotice: {
    id: ({ uuid }: { uuid: string }) => uuid,
    target: ({ entities }: { entities: any }) => entities['target'],
    MAT: (
      { actors, entities }: { actors: any[]; entities: any },
      _: any,
      { dataSources: { articleService } }: Context
    ) => {
      const target = entities['target']
      const actorIds = actors.map(actor => actor.id)
      return articleService.countAppreciationByUserIds({
        articleId: target.id,
        userIds: actorIds
      })
    }
  },
  ArticleNewSubscriberNotice: {
    id: ({ uuid }: { uuid: string }) => uuid,
    target: ({ entities }: { entities: any }) => entities['target']
  },
  ArticleNewCommentNotice: {
    id: ({ uuid }: { uuid: string }) => uuid,
    target: ({ entities }: { entities: any }) => entities['target'],
    comment: ({ entities }: { entities: any }) => entities['comment']
  },
  ArticleMentionedYouNotice: {
    id: ({ uuid }: { uuid: string }) => uuid,
    actor: ({ actors }: { actors: any[] }) => actors[0],
    target: ({ entities }: { entities: any }) => entities['target']
  },
  SubscribedArticleNewCommentNotice: {
    id: ({ uuid }: { uuid: string }) => uuid,
    target: ({ entities }: { entities: any }) => entities['target'],
    comment: ({ entities }: { entities: any }) => entities['comment']
  },
  UpstreamArticleArchivedNotice: {
    id: ({ uuid }: { uuid: string }) => uuid,
    target: ({ entities }: { entities: any }) => entities['target'],
    upstream: ({ entities }: { entities: any }) => entities['upstream']
  },
  DownstreamArticleArchivedNotice: {
    id: ({ uuid }: { uuid: string }) => uuid,
    target: ({ entities }: { entities: any }) => entities['target'],
    downstream: ({ entities }: { entities: any }) => entities['downstream']
  },
  CommentPinnedNotice: {
    id: ({ uuid }: { uuid: string }) => uuid,
    actor: (
      { entities }: { entities: any },
      _: any,
      { dataSources: { userService } }: Context
    ) => {
      const target = entities['target']
      return userService.dataloader.load(target.authorId)
    },
    target: ({ entities }: { entities: any }) => entities['target']
  },
  CommentNewReplyNotice: {
    id: ({ uuid }: { uuid: string }) => uuid,
    target: ({ entities }: { entities: any }) => entities['target'],
    reply: ({ entities }: { entities: any }) => entities['reply']
  },
  CommentNewUpvoteNotice: {
    id: ({ uuid }: { uuid: string }) => uuid,
    target: ({ entities }: { entities: any }) => entities['target']
  },
  CommentMentionedYouNotice: {
    id: ({ uuid }: { uuid: string }) => uuid,
    actor: ({ actors }: { actors: any[] }) => actors[0],
    target: ({ entities }: { entities: any }) => entities['target']
  },
  OfficialAnnouncementNotice: {
    id: ({ uuid }: { uuid: string }) => uuid,
    link: ({ data }: { data: any }) => data && data.link
  }
}
