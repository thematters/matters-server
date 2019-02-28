export default /* GraphQL */ `
  extend type Mutation {
    # audio dtaft
    putAudiodraft(input: PutAudiodraftInput!): Audiodraft! @authenticate
    deleteAudiodraft(input: DeleteAudiodraftInput!): Boolean @authenticate
    # draft
    putDraft(input: PutDraftInput!): Draft! @authenticate
    deleteDraft(input: DeleteDraftInput!): Boolean @authenticate
  }

  type Draft implements Node {
    id: ID!
    upstream: Article
    title: String
    slug: String!
    summary: String
    content: String
    scheduledAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    wordCount: Int!
    tags: [String!]
    cover: URL
    publishState: PublishState!
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
    upstreamId: ID
    title: String
    content: String
    tags: [String]
    coverAssetId: ID
  }

  input DeleteDraftInput {
    id: ID!
  }

  enum PublishState {
    unpublished
    pending
    error
    published
  }
`
