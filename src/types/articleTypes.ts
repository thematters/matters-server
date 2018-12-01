export default /* GraphQL */ `
  extend type Query {
    article(id: String!): Article
    tags(partial: String!, first: Int, after: Int): [Tag]
  }

  extend type Mutation {
    # publish with draft id
    publishArticle(id: String): Article!
    achiveArticle(id: String): Article!
    toggleSubscription(id: String): Article!
    reportArticle(id: String, category: String, description: String): Article
    appreciate(id: String, amount: Int): Int!
    readArticle(id: String): Boolean!
  }

  type Article {
    id: String!
    createdAt: DateTime!
    author: User!
    title: String!
    # url for cover
    cover: String!
    summary: String!
    tags: [String!]
    wordCount: Int
    hash: String
    content: JSON!
    gatewayUrls: [String]
    upstream: Article
    downstreams: [Article]
    relatedArticles: [Article]!
    # MAT recieved for this article
    MAT: Int!
    commentCount: Int!
    # Current user has subscribed
    subscribed: Boolean!
    pinnedComments: [Comment]
    comments(first: Int, after: Int): [Comment]
    subscribers(first: Int, after: Int): [User]
    appreciatprs(first: Int, after: Int): [User]
    hasAppreciate: Boolean!
    publishState: PublishState!
  }

  type Tag {
    text: String
    count: Int
    articles: [Article]
  }

  enum PublishState {
    archived
    pending
    error
    published
  }

`
