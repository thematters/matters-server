export default /* GraphQL */ `
  extend type Query {
    node(input: NodeInput!): Node
    frequentSearch(key: String): [String!]
    search(input: SearchInput!): [SearchResult!]
    official: Official!
  }

  extend type Mutation {
    singleFileUpload(input: SingleFileUploadInput!): Asset!
  }

  extend type Subscription {
    nodeEdited(input: NodeEditedInput!): Node!
  }

  interface Node {
    id: ID!
  }

  type SearchResult {
    entity: Entity
    match: String
  }

  type Official {
    reportCategory: [String!]!
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
    type: SearchTypes
    offset: Int
    limit: Int
  }

  input SingleFileUploadInput {
    type: AssetType!
    file: Upload!
  }

  input ListInput {
    offset: Int
    limit: Int
  }

  union Entity = User | Article | Tag

  enum SearchTypes {
    Article
    User
    Tag
  }

  enum AssetType {
    avatar
    cover
    audioDraft
  }
`
