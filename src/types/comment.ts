export default /* GraphQL */ `
  extend type Mutation {
    createOrEditComment(comment: CommentInput!, uuid: UUID): Comment
    pinComment(uuid: UUID): Comment
    deleteComment(uuid: UUID): Comment
  }

  type Comment {
    uuid: UUID!
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
    articleUUID: UUID!
    parentUUID: UUID
    mentions: [UUID]
  }

  enum Vote {
    up
    down
  }
`
