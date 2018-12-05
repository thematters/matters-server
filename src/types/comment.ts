export default /* GraphQL */ `
  extend type Mutation {
    createOrEditComment(input: CreateOrEditCommentInput): Comment
    pinComment(input: PinCommentInput): Comment
    deleteComment(input: DeleteCommentInput): Boolean
  }

  type Comment {
    uuid: UUID!
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
    myVote: Vote
    mentions: [User]
    comments: [Comment]
    parentComment: Comment
  }

  input CommentInput {
    content: String!
    quote: Boolean!
    articleUUID: UUID!
    parentUUID: UUID
    mentions: [UUID]
  }

  input CreateOrEditCommentInput {
    comment: CommentInput!
    uuid: UUID
  }

  input PinCommentInput {
    uuid: UUID
  }

  input DeleteCommentInput {
    uuid: UUID
  }

  enum Vote {
    up
    down
  }
`
