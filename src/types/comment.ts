import { NODE_TYPES } from 'common/enums'

export default /* GraphQL */ `
  extend type Mutation {
    "Publish a comment."
    putComment(input: PutCommentInput!): Comment! @authenticate @purgeCache(type: "${NODE_TYPES.comment}") @rateLimit(limit:3, period:120)

    "Remove a comment."
    deleteComment(input: DeleteCommentInput!): Comment! @authenticate @purgeCache(type: "${NODE_TYPES.comment}")

    "Pin or Unpin a comment."
    togglePinComment(input: ToggleItemInput!): Comment! @authenticate @purgeCache(type: "${NODE_TYPES.comment}")

    "Report a comment to team."
    reportComment(input: ReportCommentInput!): Boolean

    "Upvote or downvote a comment."
    voteComment(input: VoteCommentInput!): Comment! @authenticate @purgeCache(type: "${NODE_TYPES.comment}")

    "Unvote a comment."
    unvoteComment(input: UnvoteCommentInput!): Comment! @authenticate @purgeCache(type: "${NODE_TYPES.comment}")

    "Update a comments' state."
    updateCommentsState(input: UpdateCommentsStateInput!): [Comment!]! @authenticate @purgeCache(type: "${NODE_TYPES.comment}")


    ##############
    # DEPRECATED #
    ##############
    "Pin a comment."
    pinComment(input: PinCommentInput!): Comment! @authenticate @purgeCache(type: "${NODE_TYPES.comment}") @deprecated(reason: "Use \`togglePinComment\`.")

    "Unpin a comment."
    unpinComment(input: UnpinCommentInput!): Comment! @authenticate @purgeCache(type: "${NODE_TYPES.comment}") @deprecated(reason: "Use \`togglePinComment\`.")

  }

  """
  This type contains content, author, descendant comments and related data of a comment.
  """
  type Comment implements Node {
    "Unique ID of this comment."
    id: ID!

    "State of this comment."
    state: CommentState!

    "Time of this comment was created."
    createdAt: DateTime!

    "Article that the comment is belonged to."
    article: Article! @logCache(type: "${NODE_TYPES.article}")

    "Content of this comment."
    content: String

    "Author of this comment."
    author: User! @logCache(type: "${NODE_TYPES.user}")

    "This value determines this comment is pinned or not."
    pinned: Boolean!

    "The counting number of upvotes."
    upvotes: Int!

    "The counting number of downvotes."
    downvotes: Int!

    "The value determines current user's vote."
    myVote: Vote

    "Descendant comments of this comment."
    comments(input: CommentCommentsInput!): CommentConnection!

    "Parent comment of this comment."
    parentComment: Comment @logCache(type: "${NODE_TYPES.comment}")

    "A Comment that this comment replied to."
    replyTo: Comment @logCache(type: "${NODE_TYPES.comment}")

    remark: String @authorize
  }

  extend type Article {
    "The counting number of comments."
    commentCount: Int!

    "The number determines how many pinned comments can be set."
    pinCommentLimit: Int!

    "The number determines how many comments can be set as pinned comment."
    pinCommentLeft: Int!

    "List of pinned comments."
    pinnedComments: [Comment!] @logCache(type: "${NODE_TYPES.comment}")

    "List of featured comments of this article."
    featuredComments(input: FeaturedCommentsInput!): CommentConnection!

    "List of comments of this article."
    comments(input: CommentsInput!): CommentConnection!
  }

  type CommentConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [CommentEdge!]
  }

  type CommentEdge {
    cursor: String!
    node: Comment! @logCache(type: "${NODE_TYPES.comment}")
  }

  input PutCommentInput {
    comment: CommentInput!
    id: ID
  }

  input CommentInput {
    content: String!
    replyTo: ID
    articleId: ID!
    parentId: ID
    mentions: [ID!]
  }

  input CommentCommentsInput {
    author: ID
    sort: CommentSort
    after: String
    first: Int
  }

  input CommentsInput {
    sort: CommentSort
    after: String
    before: String
    includeAfter: Boolean
    includeBefore: Boolean
    first: Int
    filter: CommentsFilter
  }

  input FeaturedCommentsInput {
    sort: CommentSort
    after: String
    first: Int
  }

  input CommentsFilter {
    parentComment: ID
    state: CommentState
    author: ID
  }

  "Enums for sorting comments by time."
  enum CommentSort {
    oldest
    newest
  }

  input PinCommentInput {
    id: ID!
  }

  input UnpinCommentInput {
    id: ID!
  }

  input DeleteCommentInput {
    id: ID!
  }

  input ReportCommentInput {
    id: ID!
    category: ID!
    description: String!
    assetIds: [ID!]
    contact: String
  }

  input VoteCommentInput {
    vote: Vote!
    id: ID!
  }

  input UnvoteCommentInput {
    id: ID!
  }

  input UpdateCommentsStateInput {
    ids: [ID!]!
    state: CommentState!
  }

  "Enums for vote types."
  enum Vote {
    up
    down
  }

  "Enums for comment state."
  enum CommentState {
    active
    archived
    banned
    collapsed
  }

  "Rate limit within a given period of time, in seconds"
  directive @rateLimit(period: Int!, limit: Int!) on FIELD_DEFINITION
`
