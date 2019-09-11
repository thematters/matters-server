export default /* GraphQL */ `
  extend type Mutation {
    "Publish a comment."
    putComment(input: PutCommentInput!): Comment! @authenticate

    "Pin a comment."
    pinComment(input: PinCommentInput!): Comment! @authenticate

    "Unpin a comment."
    unpinComment(input: UnpinCommentInput!): Comment! @authenticate

    "Remove a comment."
    deleteComment(input: DeleteCommentInput!): Comment! @authenticate

    "Report a comment to team."
    reportComment(input: ReportCommentInput!): Boolean

    "Upvote or downvote a comment."
    voteComment(input: VoteCommentInput!): Comment! @authenticate

    "Unvote a comment."
    unvoteComment(input: UnvoteCommentInput!): Comment! @authenticate

    "Update a comment's state."
    updateCommentState(input: UpdateCommentStateInput!): Comment! @authorize
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
    article: Article!

    "Content of this comment."
    content: String

    "Author of this comment."
    author: User!

    "This value determines this comment is pinned or not."
    pinned: Boolean!

    "The counting number of upvotes."
    upvotes: Int!

    "The counting number of downvotes."
    downvotes: Int!

    "The value determines current user's vote."
    myVote: Vote
    mentions: [User!] @deprecated(reason: "not used")

    "Descendant comments of this comment."
    comments(input: CommentCommentsInput!): CommentConnection!

    "Parent comment of this comment."
    parentComment: Comment
    quotationStart: Int
    quotationEnd: Int
    quotationContent: String

    "A Comment that this comment replied to."
    replyTo: Comment
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
    pinnedComments: [Comment!]

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
    node: Comment! @recordCache(type: "Comment")
  }

  input PutCommentInput {
    comment: CommentInput!
    id: ID
  }

  input CommentInput {
    content: String!
    quotationStart: Int
    quotationEnd: Int
    quotationContent: String
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

  input CommentsFilter {
    parentComment: ID
    state: CommentState
    author: ID
  }

  "Enums for sorting comments by time."
  enum CommentSort {
    oldest
    newest
    upvotes @deprecated(reason: "not used")
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

  input UpdateCommentStateInput {
    id: ID!
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
  }
`
