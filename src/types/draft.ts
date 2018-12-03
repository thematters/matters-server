export default /* GraphQL */ `
  extend type Mutation {
    singleUpload(file: Upload!): File!
    createOrEditAudioDraft(data: String!, title: String, uuid: UUID): AudioDraft
    createDraft(draft: DraftInput): Draft
    deleteDraft(uuid: UUID): Draft
    editDraftMeta(uuid: UUID, field: DraftMetaField, value: String): Draft
    editDraftTags(uuid: UUID, tags: [String]): Draft
    addDraftContent(uuid: UUID, path: String, data: String): Draft
    deleteDraftContent(uuid: UUID, path: String): Draft
  }

  type Draft {
    uuid: UUID!
    upstream: Article
    title: String
    content: JSON!
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
    content: JSON
    tags: [String]
    cover: URL
  }

  enum DraftMetaField {
    upstream
    title
    tags
    cover
  }

`
