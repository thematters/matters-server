export const types = /* GraphQL */ `
  extend type Query {
    frequentSearch(key: String): [String]
    search(key: String): [SearchResult]
    official: Official!
  }

  type SearchResult {
    article: Article
    contentSection: String
  }

  type Official {
    reportCategory: [String]!
  }
`
