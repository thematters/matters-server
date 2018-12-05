export default /* GraphQL */ `
  extend type Query {
    article(uuid: UUID!): Article
    tags(partial: String!, first: Int, after: Int): [Tag]
  }

  extend type Mutation {
    # publish with draft uuid
    publishArticle(input: PublishArticleInput): Article!
    achiveArticle(input: AchiveArticleInput): Article!
    subscribe(input: SubscribeInput): Boolean
    unsubscribe(input: UnsubscribeInput): Boolean
    reportArticle(input: ReportArticleInput): Boolean
    appreciate(input: AppreciateInput): Int!
    readArticle(input: AeadArticleInput): Boolean
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
    uuid: UUID
  }

  input AchiveArticleInput {
    uuid: UUID
  }

  input SubscribeInput {
    uuid: UUID
  }

  input UnsubscribeInput {
    uuid: UUID
  }

  input ReportArticleInput {
    uuid: UUID
    category: String
    description: String
  }

  input AppreciateInput {
    uuid: UUID
    amount: Int
  }

  input ReportArticleInput {
    uuid: UUID
  }

  enum PublishState {
    archived
    pending
    error
    published
  }

`
