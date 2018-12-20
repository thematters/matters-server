export default /* GraphQL */ `
  extend type Query {
    node(input: NodeInput!): Node
    frequentSearch(key: String): [String]
    search(key: String): [SearchResult]
    official: Official!
  }

  extend type Mutation {
    singleFileUpload(input: SingleFileUploadInput): SingleFileUploadResult!
  }

  extend type Subscription {
    nodeEdited(input: NodeEditedInput!): Node!
  }

  type SearchResult {
    entity: Entity
    match: String
  }

  type Official {
    reportCategory: [String]!
  }

  interface Node {
    id: ID!
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

  input ListInput {
    offset: Int
    limit: Int
  }

  enum SearchTypes {
    Article
    User
    Tag
  }

  union Entity = User | Article | Tag

  input SingleFileUploadInput {
    type: AssetType
    file: Upload!
  }

  type SingleFileUploadResult {
    uuid: UUID!
    path: String!
  }

  type Asset {
    id: ID!
    uuid: UUID!
    authorId: String!
    type: AssetType!
    path: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum AssetType {
    avatar
    cover
    audioDraft
  }

`
