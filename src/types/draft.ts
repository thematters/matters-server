import { AUTH_MODE, CACHE_TTL, NODE_TYPES, SCOPE_GROUP } from 'common/enums'

export default /* GraphQL */ `
  extend type Mutation {
    "Create or update a draft."
    putDraft(input: PutDraftInput!): Draft! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level3}")

    "Remove a draft."
    deleteDraft(input: DeleteDraftInput!): Boolean @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level2}")
  }

  """
  This type contains content, collections, assets and related data of a draft.
  """
  type Draft implements Node @cacheControl(maxAge: ${CACHE_TTL.INSTANT}) {
    "Unique ID of this draft."
    id: ID! @cacheControl(maxAge: ${CACHE_TTL.INSTANT})

    "Collection list of this draft."
    collection(input: ConnectionArgs!): ArticleConnection!

    "Draft title."
    title: String

    "Slugified draft title."
    slug: String!

    "Summary of this draft."
    summary: String

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

    "Media hash, composed of cid encoding, of this draft."
    mediaHash: String
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

  input PutDraftInput {
    id: ID
    title: String
    content: String
    tags: [String]
    cover: ID
    collection: [ID]
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
