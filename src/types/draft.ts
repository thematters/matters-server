export default /* GraphQL */ `
  extend type Query {
    draft(uuid: UUID!): Draft
    audioDraft(uuid: UUID!): AudioDraft
  }

  extend type Mutation {
    singleUpload(input: SingleUploadInput): File!
    createOrEditAudioDraft(input: CreateOrEditAudioDraftInput): AudioDraft
    createDraft(input: CreateDraftInput): Draft
    deleteDraft(input: DeleteDraftInput): Boolean
    editDraft(input: EditDraftInput): Draft
    addDraftTag(input: AddDraftTagInput): Draft
    deleteDraftTag(input: DeleteDraftTagInput): Boolean
    deleteDraftContent(input: DeleteDraftContentInput): Boolean
  }

  type Draft {
    uuid: UUID!
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

  type File {
    filename: String!
    mimetype: String!
    encoding: String!
    path: String!
  }

  input SingleUploadInput {
    file: Upload!
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

  input DeleteDraftContentInput {
    path: String
  }

  enum DraftField {
    upstream
    title
    cover
    content
  }

`
