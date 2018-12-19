export default /* GraphQL */ `
  extend type Mutation {
    createOrEditAudioDraft(input: CreateOrEditAudioDraftInput): AudioDraft
    createDraft(input: CreateDraftInput): Draft
    deleteDraft(input: DeleteDraftInput): Boolean
    editDraft(input: EditDraftInput): Draft
    addDraftTag(input: AddDraftTagInput): Draft
    deleteDraftTag(input: DeleteDraftTagInput): Boolean
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
    authorId: Int!
    title: String
    s3Path: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input CreateOrEditAudioDraftInput {
    path: String!
    title: String
    id: ID
  }

  input CreateDraftInput {
    upstreamid: ID
    title: String
    content: String
    tags: [String]
    cover: URL
  }

  input DeleteDraftInput {
    id: ID
  }

  input EditDraftInput {
    id: ID
    field: DraftField
    value: String
  }

  input AddDraftTagInput {
    id: ID
    tag: String
  }

  input DeleteDraftTagInput {
    id: ID
    tag: String
  }

  enum DraftField {
    upstream
    title
    cover
    content
  }

`
