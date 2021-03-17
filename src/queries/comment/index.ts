import { ARTICLE_PIN_COMMENT_LIMIT } from 'common/enums'
import { toGlobalId } from 'common/utils'

import articleCommentCount from './article/commentCount'
import articleComments from './article/comments'
import articleFeaturedComments from './article/featuredComments'
import pinCommentLeft from './article/pinCommentLeft'
import articlePinnedComments from './article/pinnedComments'
import author from './author'
import circleBroadcast from './circle/broadcast'
import circleDiscussion from './circle/discussion'
import circleDiscussionCount from './circle/discussionCount'
import circleDiscussionThreadCount from './circle/discussionThreadCount'
import circlePinnedBroadcast from './circle/pinnedBroadcast'
import comments from './comments'
import content from './content'
import downvotes from './downvotes'
import fromDonator from './fromDonator'
import myVote from './myVote'
import node from './node'
import parentComment from './parentComment'
import replyTo from './replyTo'
import upvotes from './upvotes'
import userCommentedArticles from './user/commentedArticles'

export default {
  User: {
    commentedArticles: userCommentedArticles,
  },
  Article: {
    commentCount: articleCommentCount,
    pinCommentLimit: () => ARTICLE_PIN_COMMENT_LIMIT,
    pinCommentLeft,
    pinnedComments: articlePinnedComments,
    featuredComments: articleFeaturedComments,
    comments: articleComments,
  },
  Comment: {
    id: ({ id }: { id: string }) => toGlobalId({ type: 'Comment', id }),
    replyTo,
    content,
    author,
    upvotes,
    downvotes,
    myVote,
    comments,
    parentComment,
    fromDonator,
    node,
  },
  Circle: {
    broadcast: circleBroadcast,
    pinnedBroadcast: circlePinnedBroadcast,
    discussion: circleDiscussion,
    discussionCount: circleDiscussionCount,
    discussionThreadCount: circleDiscussionThreadCount,
  },
}
