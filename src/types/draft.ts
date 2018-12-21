export default /* GraphQL */ `
  extend type Mutation {
    # audio dtaft
    putAudioDraft(input: PutAudioDraftInput!): AudioDraft!
    deleteAudioDraft(input: DeleteAudioDraftInput!): Boolean
    # draft
    putDraft(input: PutDraftInput!): Draft!
    deleteDraft(input: DeleteDraftInput!): Boolean
  }

  type Draft implements Node {
    id: ID!
    upstream: Article
    title: String
    summary: String
    content: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    tags: [String]
    cover: URL
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
    audioAssetId: ID
    title: String
    length: Int
  }

  input DeleteAudioDraftInput {
    id: ID!
  }

  input PutDraftInput {
    id: ID
    upstreamId: ID
    title: String
    content: String
    tags: [String]
    coverAssetId: ID
  }

  input DeleteDraftInput {
    id: ID!
  }

`
