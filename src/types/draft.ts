import { AUTH_MODE, NODE_TYPES, SCOPE_GROUP } from 'common/enums'

export default /* GraphQL */ `
  extend type Mutation {
    "Create or update a draft."
    putDraft(input: PutDraftInput!): Draft! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level3}") @purgeCache(type: "${NODE_TYPES.draft}")

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

    "Content of this draft."
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
    cover: URL

    "State of draft during publihsing."
    publishState: PublishState!

    "List of assets are belonged to this draft."
    assets: [Asset!]!

    "Published article"
    article: Article @logCache(type: "${NODE_TYPES.article}")

    "Collection list of this draft."
    collection(input: ConnectionArgs!): ArticleConnection!

    "Circle of this draft."
    circle: Circle @logCache(type: "${NODE_TYPES.circle}") @deprecated(reason: "Use \`access.circle\` instead")

    "Access related fields on circle"
    access: DraftAccess!
  }

  type DraftConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [DraftEdge!]
  }

  type DraftEdge {
    cursor: String!
    node: Draft! @logCache(type: "${NODE_TYPES.draft}")
  }

  type DraftAccess {
    type: ArticleAccessType!
    circle: Circle @logCache(type: "${NODE_TYPES.circle}")
  }

  input PutDraftInput {
    id: ID
    title: String
    summary: String
    content: String
    tags: [String]
    cover: ID
    collection: [ID]
    circle: ID

    "Access Type, \`public\` or \`paywall\` only."
    accessType: ArticleAccessType
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
