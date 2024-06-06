import { AUTH_MODE, NODE_TYPES } from 'common/enums'

export default /* GraphQL */ `
  extend type Mutation {
    putJournal(input: PutJournalInput!): Journal! @auth(mode: "${AUTH_MODE.oauth}")
    deleteJournal(input: DeleteJournalInput!): Boolean!

    likeJournal(input: LikeJournalInput!): Journal! @auth(mode: "${AUTH_MODE.oauth}") @purgeCache(type: "${NODE_TYPES.Journal}")
    unlikeJournal(input: UnlikeJournalInput!): Journal! @auth(mode: "${AUTH_MODE.oauth}") @purgeCache(type: "${NODE_TYPES.Journal}")
  }

  input PutJournalInput {
    content: String!
    assets: [ID!]!
  }

  input DeleteJournalInput {
    id: ID!
  }
  input LikeJournalInput {
    id: ID!
  }
  input UnlikeJournalInput {
    id: ID!
  }

  """
  This type contains content, author, descendant comments and related data of a comment.
  """
  type Journal implements Node {
    id: ID!
    content: String
    assets: [Asset!]!
    author: User! @logCache(type: "${NODE_TYPES.User}")

    state: JournalState!

    commentCount: Int!
    commentedFollowees: [User!]!
    comments(input: CommentsInput!): CommentConnection! @complexity(multipliers: ["input.first"], value: 1)

    likeCount: Int!
    """whether current user has liked it"""
    liked: Boolean!

    createdAt: DateTime!
  }

  enum JournalState {
    active
    archived
  }

`
