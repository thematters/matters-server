export const types = /* GraphQL */ `
  # extend type Query {
  # }

  extend type Mutation {
    createOrEditComment(comment: CommentInput, commentId: String): Comment
  }

  type Comment {
    id: String!
    # Original article of this comment
    article: Article!
    # content
    text: String
    # Creation time of this comment
    createdAt: DateTime!
    author: User!
    achieved: Boolean!
    upvotes: Int!
    downvotes: Int!
    myVote: Vote
    mentions: [User]
    comments: [Comment]
    parentComment: Comment
  }

  input CommentInput {
    text: String!
    quote: Boolean!
    articleId: String!
    parentId: String
    mentions: [String]
  }

  enum Vote {
    up
    down
  }
`
