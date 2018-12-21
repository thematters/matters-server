export default /* GraphQL */ `
  extend type Mutation {
    # audio dtaft
    putAudioDraft(input: PutAudioDraftInput!): AudioDraft!
    deleteAudioDraft(input: DeleteAudioDraftInput!): Boolean
    # draft
    createDraft(input: CreateDraftInput!): Draft!
    deleteDraft(input: DeleteDraftInput!): Boolean
    editDraft(input: EditDraftInput!): Draft!
    # draft tag
    addDraftTag(input: AddDraftTagInput!): Draft!
    deleteDraftTag(input: DeleteDraftTagInput!): Draft!
  }

  type Draft implements Node {
    id: ID!
    upstream: Article
    title: String
    content: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    tags: [String]
    cover: URL
    abstract: String
  }

  type AudioDraft {
    id: ID!
    authorId: ID!
    title: String
    audio: URL!
    length: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input PutAudioDraftInput {
    id: ID
    audioAssetId: ID!
    title: String
    length: Int!
  }

  input DeleteAudioDraftInput {
    id: ID!
  }

  input CreateDraftInput {
    upstreamId: ID
    title: String
    content: String
    tags: [String]
    coverAssetId: ID!
  }

  input DeleteDraftInput {
    id: ID!
  }

  input EditDraftInput {
    id: ID!
    field: DraftField
    value: String
  }

  input AddDraftTagInput {
    id: ID!
    tag: String!
  }

  input DeleteDraftTagInput {
    id: ID!
    tag: String!
  }

  enum DraftField {
    upstream
    title
    cover
    content
  }

`
