export default /* GraphQL */ `
  extend type Mutation {
    publishArticle(input: PublishArticleInput!): Draft!
    archiveArticle(input: ArchiveArticleInput!): Article!
    subscribeArticle(input: SubscribeArticleInput!): Boolean
    unsubscribeArticle(input: UnsubscribeArticleInput!): Boolean
    reportArticle(input: ReportArticleInput!): Boolean
    appreciateArticle(input: AppreciateArticleInput!): Article!
    readArticle(input: ReadArticleInput!): Boolean
    recallPublish(input: RecallPublishInput!): Draft!
  }

  type Article implements Node {
    id: ID!
    createdAt: DateTime!
    publishState: PublishState!
    public: Boolean!
    author: User!
    title: String!
    cover: URL
    summary: String!
    tags: [Tag!]
    wordCount: Int
    dataHash: String
    mediaHash: String
    content: String!
    gatewayUrls: [URL!]
    upstream: Article
    downstreams(input: ListInput!): [Article!]
    relatedArticles(input: ListInput!): [Article!]
    # MAT recieved for this article
    MAT: Int!
    participantCount: Int!
    subscribers(input: ListInput!): [User!]
    appreciators(input: ListInput!): [User!]
    appreciatorCount: Int!
    # Viewer has subscribed
    subscribed: Boolean!
    # Viewer has appreciate
    hasAppreciate: Boolean!
  }

  type Tag implements Node {
    id: ID!
    content: String!
    count: Int!
    articles(input: ListInput!): [Article!]
  }

  input PublishArticleInput {
    id: ID!
    delay: Int
  }

  input ArchiveArticleInput {
    id: ID!
  }

  input SubscribeArticleInput {
    id: ID!
  }

  input UnsubscribeArticleInput {
    id: ID!
  }

  input ReportArticleInput {
    id: ID!
    category: String!
    description: String
    assetIds: [ID!]
  }

  input AppreciateArticleInput {
    id: ID!
    amount: Int
  }

  input ReadArticleInput {
    id: ID!
  }

  input RecallPublishInput {
    id: ID!
  }

  enum PublishState {
    archived
    pending
    error
    published
    banned
    recalled
  }
`
