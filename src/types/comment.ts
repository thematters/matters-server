export default /* GraphQL */ `
  extend type Mutation {
    putComment(input: PutCommentInput!): Comment! @authenticate
    pinComment(input: PinCommentInput!): Comment! @authenticate
    unpinComment(input: UnpinCommentInput!): Comment! @authenticate
    deleteComment(input: DeleteCommentInput!): Comment! @authenticate
    reportComment(input: ReportCommentInput!): Boolean
    voteComment(input: VoteCommentInput!): Comment! @authenticate
    unvoteComment(input: UnvoteCommentInput!): Comment! @authenticate
    updateCommentState(input: UpdateCommentStateInput!): Comment! @authorize
  }

  type Comment implements Node {
    id: ID!
    state: CommentState!
    createdAt: DateTime!
    # Original article of this comment
    article: Article!
    content: String
    author: User!
    pinned: Boolean!
    upvotes: Int!
    downvotes: Int!
    myVote: Vote
    mentions: [User!] @deprecated(reason: "not used")
    comments(input: CommentCommentsInput!): CommentConnection!
    parentComment: Comment
    quotationStart: Int
    quotationEnd: Int
    quotationContent: String
    replyTo: Comment
    remark: String @authorize
  }

  extend type Article {
    commentCount: Int!
    pinCommentLimit: Int!
    pinCommentLeft: Int!
    pinnedComments: [Comment!]
    comments(input: CommentsInput!): CommentConnection!
  }

  type CommentConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [CommentEdge!]
  }

  type CommentEdge {
    cursor: String!
    node: Comment!
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
    first: Int
    before: String
    filter: CommentsFilter
  }

  input CommentsFilter {
    parentComment: String
    state: CommentState
    author: String
  }

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

  enum Vote {
    up
    down
  }

  enum CommentState {
    active
    archived
    banned
  }
`
