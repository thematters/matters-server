export default /* GraphQL */ `
  extend type Mutation {
    createOrEditComment(comment: CommentInput!, id: String): Comment
    pinComment(id: String): Comment
    deleteComment(id: String): Comment
  }

  type Comment {
    id: String!
    article: Article!
    text: String
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
