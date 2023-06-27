import { AUTH_MODE } from 'common/enums'

export default /* GraphQL */ `

  extend type Mutation {

    putCollection(input: PutCollectionInput!): Collection! @auth(mode: "${AUTH_MODE.oauth}")

    deleteCollections(input: DeleteCollectionsInput!): Boolean! @auth(mode: "${AUTH_MODE.oauth}")

    "Add articles to the begining of the collections."
    addCollectionsArticles(input: AddCollectionsArticlesInput!): [Collection!]! @auth(mode: "${AUTH_MODE.oauth}")

    "Remove articles from the collection."
    deleteCollectionArticles(input: DeleteCollectionArticlesInput!): Collection! @auth(mode: "${AUTH_MODE.oauth}")

    "Reorder articles in the collection."
    reorderCollectionArticles(input: ReorderCollectionArticlesInput!): Collection! @auth(mode: "${AUTH_MODE.oauth}")

    "Toggle pin status of the work."
    togglePinWork(input: ToggleItemInput!): PinnableWork! @auth(mode: "${AUTH_MODE.oauth}")
  }

  type Collection implements Node & PinnableWork  {
     id: ID!
     title: String!
     cover: String
     description: String
     articles(input: CollectionArticlesInput!): ArticleConnection!
     pinned: Boolean!
     updatedAt: DateTime!
  }

  type CollectionEdge {
     cursor: String!
     node: Collection!
  }

  type CollectionConnection implements Connection {
     totalCount: Int!
     pageInfo: PageInfo!
     edges: [CollectionEdge!]
  }

  input CollectionArticlesInput {
    after: Int
    first: String
    reversed: Boolean = false
  }

  input PutCollectionInput {
    id: ID
    title: String
    cover: ID
    description: String
  }

  input DeleteCollectionsInput {
    ids: [ID!]!
  }

  input AddCollectionsArticlesInput {
    collections: [ID!]!
    articles: [ID!]!
  }
  input  DeleteCollectionArticlesInput {
    collection: ID!
    articles: [ID!]!
  }

  input ReorderMoveInput {
    item: ID!
    "The new position move to. To move item to the beginning of the list, set to 0. To the end of the list, set to the length of the list."
    newPosition: Int!
  }

  input  ReorderCollectionArticlesInput {
    collection: ID!
    moves: [ReorderMoveInput!]!
  }
`
