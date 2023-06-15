import { AUTH_MODE, NODE_TYPES, SCOPE_GROUP } from 'common/enums'

export default /* GraphQL */ `
  extend type Mutation {
    "Create or update a draft."
    putDraft(input: PutDraftInput!): Draft! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level3}") @purgeCache(type: "${NODE_TYPES.Draft}")

    "Remove a draft."
    deleteDraft(input: DeleteDraftInput!): Boolean @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level2}")
  }

  """
  This type contains content, collections, assets and related data of a draft.
  """
  type Draft implements Node {
    "Unique ID of this draft."
    id: ID!

    "Media hash, composed of cid encoding, of this draft."
    mediaHash: String

    "Draft title."
    title: String

    "Slugified draft title."
    slug: String!

    "Summary of this draft."
    summary: String

    "This value determines if the summary is customized or not."
    summaryCustomized: Boolean!

    "Content (HTML) of this draft."
    content: String

    "Time of this draft was created."
    createdAt: DateTime!

    "Last time of this draft was upadted."
    updatedAt: DateTime!

    "The counting number of words in this draft."
    wordCount: Int!

    "Tags are attached to this draft."
    tags: [String!]

    "Draft's cover link."
    cover: String

    "State of draft during publihsing."
    publishState: PublishState!

    "List of assets are belonged to this draft."
    assets: [Asset!]!

    "Published article"
    article: Article @logCache(type: "${NODE_TYPES.Article}")

    "Collection list of this draft."
    collection(input: ConnectionArgs!): ArticleConnection! @complexity(multipliers: ["input.first"], value: 1)

    "Access related fields on circle"
    access: DraftAccess!

    "whether content is marked as sensitive by author"
    sensitiveByAuthor: Boolean!

    "License Type"
    license: ArticleLicenseType!

    "creator message asking for support"
    requestForDonation: String

    "creator message after support"
    replyToDonator: String

    "whether publish to ISCN"
    iscnPublish: Boolean

    "whether readers can comment"
    canComment: Boolean!
  }

  type DraftConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [DraftEdge!]
  }

  type DraftEdge {
    cursor: String!
    node: Draft! @logCache(type: "${NODE_TYPES.Draft}")
  }

  type DraftAccess {
    type: ArticleAccessType!
    circle: Circle @logCache(type: "${NODE_TYPES.Circle}")
  }

  input PutDraftInput {
    id: ID
    title: String
    summary: String
    content: String
    tags: [String!]
    cover: ID
    collection: [ID]
    circle: ID
    accessType: ArticleAccessType
    sensitive: Boolean
    license: ArticleLicenseType

    requestForDonation: String  @constraint(maxLength: 140)
    replyToDonator: String  @constraint(maxLength: 140)

    "whether publish to ISCN"
    iscnPublish: Boolean

    "whether readers can comment"
    canComment: Boolean
  }

  input DeleteDraftInput {
    id: ID!
  }

  "Enums for publishing state."
  enum PublishState {
    unpublished
    pending
    error
    published
  }
`
