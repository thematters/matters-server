export default /* GraphQL */ `
  extend type Mutation {
    # audio dtaft
    putAudiodraft(input: PutAudiodraftInput!): Audiodraft!
    deleteAudiodraft(input: DeleteAudiodraftInput!): Boolean
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
    publishState: PublishState!
  }

  type Audiodraft {
    id: ID!
    authorId: ID!
    title: String
    audio: URL!
    length: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type DraftConnection {
    pageInfo: PageInfo!
    edges: [DraftEdge]!
  }

  type DraftEdge {
    cursor: String!
    node: Draft!
  }

  type AudiodraftConnection {
    pageInfo: PageInfo!
    edges: [AudiodraftEdge]!
  }

  type AudiodraftEdge {
    cursor: String!
    node: Audiodraft!
  }

  input PutAudiodraftInput {
    id: ID
    audioAssetId: ID
    title: String
    length: Int
  }

  input DeleteAudiodraftInput {
    id: ID!
  }

  input PutDraftInput {
    id: ID
    upstreamId: ID
    title: String
    content: String!
    tags: [String]
    coverAssetId: ID
  }

  input DeleteDraftInput {
    id: ID!
  }

`
