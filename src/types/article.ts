export default /* GraphQL */ `
  extend type Query {
    article(uuid: UUID!): Article
    tags(partial: String!, first: Int, after: Int): [Tag]
  }

  extend type Mutation {
    publishArticle(input: PublishArticleInput): Article!
    archiveArticle(input: ArchiveArticleInput): Article!
    subscribeArticle(input: SubscribeArticleInput): Boolean
    unsubscribeArticle(input: UnsubscribeArticleInput): Boolean
    reportArticle(input: ReportArticleInput): Boolean
    appreciateArticle(input: AppreciateArticleInput): Int!
    readArticle(input: ReadArticleInput): Boolean
  }

  type Article {
    uuid: UUID!
    createdAt: DateTime!
    author: User!
    title: String!
    # url for cover
    cover: URL!
    summary: String!
    tags: [Tag!]
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

  input PublishArticleInput {
    # publish with draft uuid
    uuid: UUID
  }

  input ArchiveArticleInput {
    uuid: UUID
  }

  input SubscribeArticleInput {
    uuid: UUID
  }

  input UnsubscribeArticleInput {
    uuid: UUID
  }

  input ReportArticleInput {
    uuid: UUID
    category: String
    description: String
  }

  input AppreciateArticleInput {
    uuid: UUID
    amount: Int
  }

  input ReadArticleInput {
    uuid: UUID
  }

  enum PublishState {
    archived
    pending
    error
    published
  }

`
