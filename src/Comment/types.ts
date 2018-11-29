export const types = /* GraphQL */ `
  # extend type Query {
  # }

  # extend type Mutation {
  # }

  type Comment {
    id: String!
    # Creation time of this comment
    timestamp: DateTime!
    text: String!
    achieved: Boolean!
    # Original article of this comment
    article: Article!
    author: User!
    mentions: [User]
    comments: [Comment]
    parentComment: Comment
  }
`
