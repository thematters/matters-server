import { AUTH_MODE, NODE_TYPES } from 'common/enums'

export default /* GraphQL */ `

  extend type Mutation {

    putCollection(input: PutCollectionInput!): Collection! @auth(mode: "${AUTH_MODE.oauth}") @purgeCache(type: "${NODE_TYPES.Collection}")

    deleteCollections(input: DeleteCollectionsInput!): Boolean! @complexity(value: 10, multipliers: ["input.ids"]) @auth(mode: "${AUTH_MODE.oauth}") @purgeCache(type: "${NODE_TYPES.Collection}")

    "Add articles to the begining of the collections."
    addCollectionsArticles(input: AddCollectionsArticlesInput!): [Collection!]! @complexity(value: 10, multipliers: ["input.collections"]) @auth(mode: "${AUTH_MODE.oauth}") @purgeCache(type: "${NODE_TYPES.Collection}")

    "Remove articles from the collection."
    deleteCollectionArticles(input: DeleteCollectionArticlesInput!): Collection! @complexity(value: 10, multipliers: ["input.articles"]) @auth(mode: "${AUTH_MODE.oauth}")
    "Reorder articles in the collection."
    reorderCollectionArticles(input: ReorderCollectionArticlesInput!): Collection! @auth(mode: "${AUTH_MODE.oauth}") @purgeCache(type: "${NODE_TYPES.Collection}")

    likeCollection(input: LikeCollectionInput!): Collection! @auth(mode: "${AUTH_MODE.oauth}") @purgeCache(type: "${NODE_TYPES.Collection}")
    unlikeCollection(input: UnlikeCollectionInput!): Collection! @auth(mode: "${AUTH_MODE.oauth}") @purgeCache(type: "${NODE_TYPES.Collection}")
  }

  type Collection implements Node & PinnableWork  {
     id: ID!
     title: String!
     cover: String
     description: String
     author: User!
     articles(input: CollectionArticlesInput!): ArticleConnection!
     pinned: Boolean!
     updatedAt: DateTime!

     likeCount: Int!
     """whether current user has liked it"""
     liked: Boolean! @privateCache

     "Check if the collection contains the article"
     contains(input: NodeInput!): Boolean!
  }

  type CollectionEdge {
     cursor: String!
     node: Collection! @logCache(type: "${NODE_TYPES.Collection}")
  }

  type CollectionConnection implements Connection {
     totalCount: Int!
     pageInfo: PageInfo!
     edges: [CollectionEdge!]
  }

  type CollectionNotice implements Notice {
    """Unique ID of this notice."""
    id: ID!

    """The value determines if the notice is unread or not."""
    unread: Boolean!

    """Time of this notice was created."""
    createdAt: DateTime!

    """List of notice actors."""
    actors: [User!]
    target: Collection!
  }

  input CollectionArticlesInput {
    after: String
    first: Int
    reversed: Boolean = True
  }

  input PutCollectionInput {
    id: ID
    title: String
    cover: ID
    description: String
    pinned: Boolean
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
    "The new position move to. To move item to the beginning of the list, set to 0. To the end of the list, set to the length of the list - 1."
    newPosition: Int!
  }

  input  ReorderCollectionArticlesInput {
    collection: ID!
    moves: [ReorderMoveInput!]!
  }
  input LikeCollectionInput {
    id: ID!
  }
  input UnlikeCollectionInput {
    id: ID!
  }
`
