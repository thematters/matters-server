export default /* GraphQL */ `
  extend type Mutation {
    singleUpload(file: Upload!): File!
    createOrEditAudioDraft(data: String!, title: String, uuid: UUID): AudioDraft
    createDraft(draft: DraftInput): Draft
    deleteDraft(uuid: UUID): Draft
    editDraft(uuid: UUID, field: DraftField, value: String): Draft
    addDraftTag(uuid: UUID, tag: String): Draft
    deleteDraftTag(uuid: UUID, tag: String): Draft
    deleteDraftContent(data: String): Draft
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

  input DraftInput {
    upstreamUUID: UUID
    title: String
    content: String
    tags: [String]
    cover: URL
  }

  enum DraftField {
    upstream
    title
    cover
    content
  }

`
