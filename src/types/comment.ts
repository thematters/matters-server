export default /* GraphQL */ `
  extend type Mutation {
    createOrEditComment(input: CreateOrEditCommentInput): Comment
    pinComment(input: PinCommentInput): Comment
    deleteComment(input: DeleteCommentInput): Boolean
  }

  extend type Subscription {
    commentChanged: Comment
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
    quotation: String
    myVote: Vote
    mentions: [User]
    comments: [Comment]
    parentComment: Comment
  }

  input CommentInput {
    content: String!
    quotation: String
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
