export default /* GraphQL */ `
  extend type Query {
    draft(uuid: UUID!): Draft
    audioDraft(uuid: UUID!): AudioDraft
  }

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
    uuid: UUID!
    authorId: Int!
    title: String
    s3Path: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input CreateOrEditAudioDraftInput {
    path: String!
    title: String
    uuid: UUID
  }

  input CreateDraftInput {
    upstreamUUID: UUID
    title: String
    content: String
    tags: [String]
    cover: URL
  }

  input DeleteDraftInput {
    uuid: UUID
  }

  input EditDraftInput {
    uuid: UUID
    field: DraftField
    value: String
  }

  input AddDraftTagInput {
    uuid: UUID
    tag: String
  }

  input DeleteDraftTagInput {
    uuid: UUID
    tag: String
  }

  enum DraftField {
    upstream
    title
    cover
    content
  }

`
