export default /* GraphQL */ `
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
    title: String
    createdAt: DateTime!
    file: File!
  }

  type File {
    filename: String!
    mimetype: String!
    encoding: String!
    data: String!
  }

  input SingleUploadInput {
    file: Upload!
  }

  input CreateOrEditAudioDraftInput {
    data: String!
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
    data: String
  }

  enum DraftField {
    upstream
    title
    cover
    content
  }

`
