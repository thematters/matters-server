export default /* GraphQL */ `
  extend type Mutation {
    createOrEditComment(input: CreateOrEditCommentInput): Comment
    pinComment(input: PinCommentInput): Comment
    deleteComment(input: DeleteCommentInput): Boolean
  }

  type Comment implements Node {
    id: ID!
    # Original article of this comment
    article: Article!
    # content
    content: String
    # Creation time of this comment
    createdAt: DateTime!
    author: User!
    achieved: Boolean!
    upvotes: Int!
    downvotes: Int!
    quotation: String
    myVote: Vote
    mentions: [User]
    comments: [Comment]
    parentComment: Comment
  }

  input CommentInput {
    content: String!
    quotation: String
    articleId: ID!
    parentId: ID
    mentions: [ID]
  }

  input CreateOrEditCommentInput {
    comment: CommentInput!
    id: ID
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
