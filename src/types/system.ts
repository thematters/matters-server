export default /* GraphQL */ `
  extend type Query {
    frequentSearch(key: String): [String]
    search(key: String): [SearchResult]
    official: Official!
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
