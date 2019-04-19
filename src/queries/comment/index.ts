import { toGlobalId } from 'common/utils'
import { ARTICLE_PIN_COMMENT_LIMIT } from 'common/enums'

import userCommentedArticles from './user/commentedArticles'
import articleCommentCount from './article/commentCount'
import articlePinnedComments from './article/pinnedComments'
import pinCommentLeft from './article/pinCommentLeft'
import articleComments from './article/comments'
import article from './article'
import content from './content'
import author from './author'
import upvotes from './upvotes'
import downvotes from './downvotes'
import myVote from './myVote'
import mentions from './mentions'
import comments from './comments'
import parentComment from './parentComment'
import replyTo from './replyTo'

export default {
  User: {
    commentedArticles: userCommentedArticles
  },
  Article: {
    commentCount: articleCommentCount,
    pinCommentLimit: () => ARTICLE_PIN_COMMENT_LIMIT,
    pinCommentLeft,
    pinnedComments: articlePinnedComments,
    comments: articleComments
  },
  Comment: {
    id: ({ id }: { id: string }) => toGlobalId({ type: 'Comment', id }),
    replyTo,
    article,
    content,
    author,
    upvotes,
    downvotes,
    myVote,
    mentions,
    comments,
    parentComment
  }
}
