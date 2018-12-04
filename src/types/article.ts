export default /* GraphQL */ `
  extend type Query {
    article(uuid: UUID!): Article
    tags(partial: String!, first: Int, after: Int): [Tag]
  }

  extend type Mutation {
    # publish with draft uuid
    publishArticle(uuid: UUID): Article!
    achiveArticle(uuid: UUID): Article!
    toggleSubscription(uuid: UUID): Article!
    reportArticle(uuid: UUID, category: String, description: String): Article
    appreciate(uuid: UUID, amount: Int): Int!
    readArticle(uuid: UUID): Boolean!
  }

  type Article {
    uuid: UUID!
    createdAt: DateTime!
    author: User!
    title: String!
    # url for cover
    cover: URL!
    summary: String!
    tags: [String!]
    wordCount: Int
    hash: String
    content: String!
    gatewayUrls: [URL]
    upstream: Article
    downstreams: [Article]
    relatedArticles(first: Int, after: Int): [Article]!
    # MAT recieved for this article
    MAT: Int!
    commentCount: Int!
    # Current user has subscribed
    subscribed: Boolean!
    pinnedComments: [Comment]
    comments(first: Int, after: Int): [Comment]
    subscribers(first: Int, after: Int): [User]
    appreciators(first: Int, after: Int): [User]
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
