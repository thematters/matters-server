export default /* GraphQL */ `
  extend type Query {
    node(input: NodeInput!): Node
    frequentSearch(key: String): [String!]
    search(input: SearchInput!): [SearchResult!]
    official: Official!
  }

  extend type Mutation {
    singleFileUpload(input: SingleFileUploadInput!): Asset!
    feedback(input: FeedbackInput!): Boolean
  }

  extend type Subscription {
    nodeEdited(input: NodeEditedInput!): Node!
  }

  interface Node {
    id: ID!
  }

  type SearchResult {
    node: Node
    match: String
  }

  type Official {
    reportCategory: [String!]!
    feedbackCategory: [String!]!
  }

  type Asset {
    id: ID!
    type: AssetType!
    path: String!
    createdAt: DateTime!
  }

  input NodeInput {
    id: ID!
  }

  input NodeEditedInput {
    id: ID!
  }

  input SearchInput {
    key: String!
    type: SearchTypes!
    offset: Int
    limit: Int
  }

  input SingleFileUploadInput {
    type: AssetType!
    file: Upload!
  }

  input FeedbackInput {
    category: String!
    description: String
    assetIds: [ID!]
    contact: String
  }

  input ListInput {
    offset: Int
    limit: Int
  }

  enum SearchTypes {
    Article
    User
    Tag
  }

  enum AssetType {
    avatar
    cover
    audioDraft
    report
    feedback
  }
`
