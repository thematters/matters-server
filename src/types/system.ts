export default /* GraphQL */ `
  extend type Query {
    node(input: NodeInput!): Node
    frequentSearch(key: String): [String]
    search(key: String): [SearchResult]
    official: Official!
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
`
