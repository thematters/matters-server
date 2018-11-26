export const types = /* GraphQL */ `
  extend type Query {
    article(id: String!): Article
  }

  extend type Mutation {
    achiveArticle(id: String): Article
  }

  type Article {
    id: String!
    form: ArticleForm!
    timestamp: DateTime!
    title: String!
    cover: String!
    tags: [String!]
    publishState: PublishState
    hash: String
    # MAT recieved for this article
    MAT: Int!
    author: User!
    content: String!
    wordCount: Int
    upstream: Article
    downstreams: [Article]
    relatedArticles: [Article]!
    subscribers: [User]
    commentCount: Int!
    comments: [Comment]
    pinnedComments: [Comment]
  }

  enum ArticleForm {
    article
    course
  }
  enum PublishState {
    archived
    pending
    error
    published
  }
`
