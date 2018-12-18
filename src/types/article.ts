export default /* GraphQL */ `
  extend type Query {
    tag(input: TagInput): Tag
  }

  input TagInput {
    id: ID!
  }

  extend type Mutation {
    publishArticle(input: PublishArticleInput): Article!
    archiveArticle(input: ArchiveArticleInput): Article!
    subscribeArticle(input: SubscribeArticleInput): Boolean
    unsubscribeArticle(input: UnsubscribeArticleInput): Boolean
    reportArticle(input: ReportArticleInput): Boolean
    appreciateArticle(input: AppreciateArticleInput): Int!
    readArticle(input: ReadArticleInput): Boolean
    recallPublication(input: RecallPublicationInput): Draft!
  }

  type Article implements Node {
    id: ID!
    createdAt: DateTime!
    public: Boolean!
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
    relatedArticles(input: ListInput): [Article]!
    # MAT recieved for this article
    MAT: Int!
    commentCount: Int!
    # Current user has subscribed
    subscribed: Boolean!
    pinnedComments: [Comment]
    comments(input: CommentsInput): [Comment]
    subscribers(input: ListInput): [User]
    appreciators(input: ListInput): [User]
    appreciatorCount: Int!
    hasAppreciate: Boolean!
    publishState: PublishState!
  }

  type Tag implements Node {
    id: ID!
    content: String
    count: Int
    articles(input: ListInput): [Article]
  }

  input CommentsInput {
    offset: Int
    limit: Int
    byViewer: Boolean
    hasCitation: Boolean
    sort: CommentSort
  }

  input PublishArticleInput {
    # publish with draft id
    id: ID!
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
    category: String
    description: String
  }

  input AppreciateArticleInput {
    id: ID!
    amount: Int
  }

  input ReadArticleInput {
    id: ID!
  }

  input RecallPublicationInput {
    id: ID!
  }

  enum PublishState {
    archived
    pending
    error
    published
  }

  enum CommentSort {
    oldest
    newest
  }
`
