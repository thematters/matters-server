export default /* GraphQL */ `
  union Response = Article | Comment

  extend type Article {
    responses(input: ResponsesInput!): ResponseConnection!
  }

  type ResponseConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [ResponseEdge!]
  }

  type ResponseEdge {
    cursor: String!
    node: Response!
  }

  input ResponsesInput {
    sort: ResponseSort
    after: String
    before: String
    includeAfter: Boolean
    includeBefore: Boolean
    first: Int
  }

  enum ResponseSort {
    oldest
    newest
  }
`
