export default /* GraphQL */ `
  extend type Mutation {
    putComment(input: PutCommentInput!): Comment!
    pinComment(input: PinCommentInput!): Comment!
    deleteComment(input: DeleteCommentInput!): Boolean
  }

  type Comment implements Node {
    id: ID!
    state: CommentState!
    createdAt: DateTime!
    # Original article of this comment
    article: Article!
    content: String
    author: User!
    upvotes: Int!
    downvotes: Int!
    quote: Boolean!
    myVote: Vote
    mentions: [User!]
    comments: [Comment!]
    parentComment: Comment
  }

  extend type Article {
    commentCount: Int!
    pinnedComments: [Comment!]
    comments(input: CommentsInput!): [Comment!]
  }

  input PutCommentInput {
    comment: CommentInput!
    id: ID
  }

  input CommentInput {
    content: String!
    quotation: String
    articleId: ID!
    parentId: ID
    mentions: [ID!]
  }

  input CommentsInput {
    offset: Int
    limit: Int
    author: ID
    quote: Boolean
    sort: CommentSort
  }

  enum CommentSort {
    oldest
    newest
    upvotes
  }

  input PinCommentInput {
    id: ID!
  }

  input DeleteCommentInput {
    id: ID!
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
