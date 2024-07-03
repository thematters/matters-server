import { AUTH_MODE, NODE_TYPES } from 'common/enums'
import { isProd } from 'common/environment'

const POST_MOMENT_RATE_LIMIT = isProd ? 2 : 20

export default /* GraphQL */ `
  extend type Query {
    moment(input: MomentInput!): Moment
  }
  extend type Mutation {
    putMoment(input: PutMomentInput!): Moment! @auth(mode: "${AUTH_MODE.oauth}") @rateLimit(limit:${POST_MOMENT_RATE_LIMIT}, period:300)
    deleteMoment(input: DeleteMomentInput!): Boolean!

    likeMoment(input: LikeMomentInput!): Moment! @auth(mode: "${AUTH_MODE.oauth}") @purgeCache(type: "${NODE_TYPES.Moment}")
    unlikeMoment(input: UnlikeMomentInput!): Moment! @auth(mode: "${AUTH_MODE.oauth}") @purgeCache(type: "${NODE_TYPES.Moment}")
  }

  input MomentInput {
    shortHash: String!
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
    shortHash: String!
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
