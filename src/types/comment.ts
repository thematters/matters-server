export default /* GraphQL */ `
  extend type Mutation {
    putComment(input: PutCommentInput!): Comment!
    pinComment(input: PinCommentInput!): Comment!
    deleteComment(input: DeleteCommentInput!): Boolean
  }

  type Comment implements Node {
    id: ID!
    createdAt: DateTime!
    # Original article of this comment
    article: Article!
    content: String
    author: User!
    archived: Boolean!
    upvotes: Int!
    downvotes: Int!
    quotation: String
    myVote: Vote
    mentions: [User!]
    comments: [Comment!]
    parentComment: Comment
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
`
