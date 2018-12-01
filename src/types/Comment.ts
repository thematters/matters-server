export default /* GraphQL */ `
  extend type Mutation {
    createOrEditComment(comment: CommentInput!, id: String): Comment
    pinComment(id: String): Comment
    deleteComment(id: String): Comment
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
