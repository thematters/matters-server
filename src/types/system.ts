export default /* GraphQL */ `
  extend type Query {
    node(input: NodeInput!): Node
    frequentSearch(key: String): [String]
    search(key: String): [SearchResult]
    official: Official!
  }

  extend type Mutation {
    createAsset(input: CreateAssetInput): Asset
    deleteAsset(input: DeleteAssetInput): Boolean
  }

  extend type Subscription {
    nodeEdited(input: NodeEditedInput!): Node!
  }

  interface Node {
    id: ID!
  }

  input NodeInput {
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

  type SearchResult {
    entity: Entity
    match: String
  }

  type Official {
    reportCategory: [String]!
  }

  type Asset implements Node {
    id: ID!
    uuid: UUID!
    authorId: Int!
    type: String!
    path: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input CreateAssetInput {
    type: String!
    path: String!
  }

  input DeleteAssetInput {
    id: ID!
  }
`
