import { CACHE_TTL } from 'common/enums'

export default /* GraphQL */ `
  extend type Mutation {
    putAudiodraft(input: PutAudiodraftInput!): Audiodraft! @authenticate
    deleteAudiodraft(input: DeleteAudiodraftInput!): Boolean @authenticate

    "Create or update a draft."
    putDraft(input: PutDraftInput!): Draft! @authenticate

    "Remove a draft."
    deleteDraft(input: DeleteDraftInput!): Boolean @authenticate
  }

  """
  This type contains content, collections, assets and related data of a draft.
  """
  type Draft implements Node @cacheControl(maxAge: "${CACHE_TTL.INSTANT}" scope: PRIVATE) {
    "Unique ID of this draft."
    id: ID!

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
    scheduledAt: DateTime

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

    "List of asstets are belonged to this draft."
    assets: [Asset!]!
  }

  type Audiodraft {
    id: ID!
    authorId: ID!
    title: String
    audio: URL!
    length: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type DraftConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [DraftEdge!]
  }

  type DraftEdge {
    cursor: String!
    node: Draft!
  }

  type AudiodraftConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [AudiodraftEdge!]
  }

  type AudiodraftEdge {
    cursor: String!
    node: Audiodraft!
  }

  input PutAudiodraftInput {
    id: ID
    audioAssetId: ID
    title: String
    length: Int
  }

  input DeleteAudiodraftInput {
    id: ID!
  }

  input PutDraftInput {
    id: ID
    title: String
    content: String
    tags: [String]
    coverAssetId: ID
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
