import { AUTH_MODE, NODE_TYPES } from 'common/enums'

export default /* GraphQL */ `
  extend type Mutation {
    putMoment(input: PutMomentInput!): Moment! @auth(mode: "${AUTH_MODE.oauth}") @rateLimit(limit:2, period:300)
    deleteMoment(input: DeleteMomentInput!): Boolean!

    likeMoment(input: LikeMomentInput!): Moment! @auth(mode: "${AUTH_MODE.oauth}") @purgeCache(type: "${NODE_TYPES.Moment}")
    unlikeMoment(input: UnlikeMomentInput!): Moment! @auth(mode: "${AUTH_MODE.oauth}") @purgeCache(type: "${NODE_TYPES.Moment}")
  }

  input PutMomentInput {
    content: String!
    assets: [ID!]!
  }

  input DeleteMomentInput {
    id: ID!
  }
  input LikeMomentInput {
    id: ID!
  }
  input UnlikeMomentInput {
    id: ID!
  }

  type Moment implements Node {
    id: ID!
    content: String
    assets: [Asset!]!
    author: User! @logCache(type: "${NODE_TYPES.User}")

    state: MomentState!

    commentCount: Int!
    commentedFollowees: [User!]!
    comments(input: CommentsInput!): CommentConnection! @complexity(multipliers: ["input.first"], value: 1)

    likeCount: Int!
    """whether current user has liked it"""
    liked: Boolean!

    createdAt: DateTime!
  }

  enum MomentState {
    active
    archived
  }

`
