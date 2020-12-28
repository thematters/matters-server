import { AUTH_MODE, NODE_TYPES, SCOPE_GROUP } from 'common/enums'

export default /* GraphQL */ `
  extend type Mutation {
    "Publish a comment."
    putComment(input: PutCommentInput!): Comment! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level2}") @purgeCache(type: "${NODE_TYPES.comment}") @rateLimit(limit:3, period:120)

    "Remove a comment."
    deleteComment(input: DeleteCommentInput!): Comment! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level2}") @purgeCache(type: "${NODE_TYPES.comment}")

    "Pin or Unpin a comment."
    togglePinComment(input: ToggleItemInput!): Comment! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.comment}")

    "Upvote or downvote a comment."
    voteComment(input: VoteCommentInput!): Comment! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.comment}")

    "Unvote a comment."
    unvoteComment(input: UnvoteCommentInput!): Comment! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.comment}")

    "Update a comments' state."
    updateCommentsState(input: UpdateCommentsStateInput!): [Comment!]! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level2}") @purgeCache(type: "${NODE_TYPES.comment}")


    ##############
    # DEPRECATED #
    ##############
    "Pin a comment."
    pinComment(input: PinCommentInput!): Comment! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.comment}")

    "Unpin a comment."
    unpinComment(input: UnpinCommentInput!): Comment! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.comment}")
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

    "This value determines this comment is from article donator or not."
    fromDonator: Boolean!

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

    remark: String @auth(mode: "${AUTH_MODE.admin}")

    "Current comment belongs to which Node."
    belongTo: Node!
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

  extend type Circle {
    "Comments broadcasted by Circle owner."
    broadcast(input: ConnectionArgs!): CommentConnection!

    "Comments made by Circle member."
    discussion(input: ConnectionArgs!): CommentConnection!
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
`
