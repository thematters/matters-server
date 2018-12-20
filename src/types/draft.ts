export default /* GraphQL */ `
  extend type Mutation {
    # audio dtaft
    putAudioDraft(input: PutAudioDraftInput!): AudioDraft!
    # draft
    createDraft(input: CreateDraftInput!): Draft!
    deleteDraft(input: DeleteDraftInput!): Boolean
    editDraft(input: EditDraftInput!): Draft!
    # draft tag
    addDraftTag(input: AddDraftTagInput!): Draft!
    deleteDraftTag(input: DeleteDraftTagInput!): Boolean
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
    audio: String!
    length: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input PutAudioDraftInput {
    id: ID
    audio: String!
    title: String
    length: Int!
  }

  input CreateDraftInput {
    upstreamId: ID
    title: String
    content: String
    tags: [String]
    cover: URL
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
