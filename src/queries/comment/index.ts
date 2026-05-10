import {
  ARTICLE_PIN_COMMENT_LIMIT,
  COMMENT_TYPES_REVERSED,
  NODE_TYPES,
} from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'

import articleCommentCount from './article/commentCount.js'
import articleComments from './article/comments.js'
import articleFeaturedComments from './article/featuredComments.js'
import pinCommentLeft from './article/pinCommentLeft.js'
import articlePinnedComments from './article/pinnedComments.js'
import author from './author.js'
import circleBroadcast from './circle/broadcast.js'
import circleDiscussion from './circle/discussion.js'
import circleDiscussionCount from './circle/discussionCount.js'
import circleDiscussionThreadCount from './circle/discussionThreadCount.js'
import circlePinnedBroadcast from './circle/pinnedBroadcast.js'
import comments from './comments.js'
import communityWatchAction from './communityWatchAction.js'
import communityWatchActionPublic from './communityWatchActionPublic.js'
import communityWatchActions from './communityWatchActions.js'
import content from './content.js'
import downvotes from './downvotes.js'
import fromDonator from './fromDonator.js'
import myVote from './myVote.js'
import node from './node.js'
import parentComment from './parentComment.js'
import replyTo from './replyTo.js'
import rootCommunityWatchAction from './rootCommunityWatchAction.js'
import { spamStatus } from './spamStatus.js'
import upvotes from './upvotes.js'
import userCommentedArticles from './user/commentedArticles.js'

export default {
  Query: {
    communityWatchAction: rootCommunityWatchAction,
    communityWatchActions,
  },
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
    id: ({ id }: { id: string }) =>
      toGlobalId({ type: NODE_TYPES.Comment, id }),
    replyTo,
    communityWatchAction,
    content,
    author,
    upvotes,
    downvotes,
    myVote,
    comments,
    parentComment,
    fromDonator,
    spamStatus,
    type: ({ type }: { type: string }) => COMMENT_TYPES_REVERSED[type],
    node,
  },
  CommunityWatchAction: communityWatchActionPublic,
  Circle: {
    broadcast: circleBroadcast,
    pinnedBroadcast: circlePinnedBroadcast,
    discussion: circleDiscussion,
    discussionCount: circleDiscussionCount,
    discussionThreadCount: circleDiscussionThreadCount,
  },
}
