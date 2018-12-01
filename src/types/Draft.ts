export default /* GraphQL */ `
  extend type Mutation {
    singleUpload(file: Upload!): File!
    createOrEditAudioDraft(data: String!, title: String, id: String): AudioDraft
    createDraft(draft: DraftInput): Draft
    deleteDraft(id: String): Draft
    editDraftMeta(id: String, field: DraftMetaField, value: String): Draft
    editDraftTags(id: String, tags: [String]): Draft
    addDraftContent(id: String, path: String, data: String): Draft
    deleteDraftContent(id: String, path: String): Draft
  }

  type Draft {
    id: String!
    upstream: Article
    title: String
    content: JSON!
    createdAt: DateTime!
    updateAt: DateTime!
    tags: [String]
    cover: String
    abstract: String
  }

  type AudioDraft {
    title: String
    createdAt: String!
    file: File!
  }

  type File {
    filename: String!
    mimetype: String!
    encoding: String!
    data: String!
  }

  input DraftInput {
    upstreamId: String
    title: String
    content: JSON
    tags: [String]
    cover: String
  }

  enum DraftMetaField {
    upstream
    title
    tags
    cover
  }

`
