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
    mimetype: String!
    encoding: String!
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
