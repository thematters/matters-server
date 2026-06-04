import { AUTH_MODE, NODE_TYPES } from '#common/enums/index.js'
import { isProd } from '#common/environment.js'

const POST_MOMENT_RATE_LIMIT = isProd ? 2 : 20

export default /* GraphQL */ `
  extend type Query {
    moment(input: MomentInput!): Moment @privateCache @logCache(type: "${NODE_TYPES.Moment}")
  }
  extend type OSS {
    momentFeedUsers(input: MomentFeedUsersInput!): UserConnection! @complexity(multipliers: ["input.first"], value: 1)
  }
  extend type Mutation {
    putMoment(input: PutMomentInput!): Moment! @auth(mode: "${AUTH_MODE.oauth}") @rateLimit(limit: ${POST_MOMENT_RATE_LIMIT}, period: 300) @logCache(type: "${NODE_TYPES.Moment}")
    deleteMoment(input: DeleteMomentInput!): Moment! @auth(mode: "${AUTH_MODE.oauth}") @purgeCache(type: "${NODE_TYPES.Moment}")

    likeMoment(input: LikeMomentInput!): Moment! @auth(mode: "${AUTH_MODE.oauth}") @purgeCache(type: "${NODE_TYPES.Moment}")
    unlikeMoment(input: UnlikeMomentInput!): Moment! @auth(mode: "${AUTH_MODE.oauth}") @purgeCache(type: "${NODE_TYPES.Moment}")

    applyMomentFeed: User! @auth(mode: "${AUTH_MODE.oauth}") @purgeCache(type: "${NODE_TYPES.User}")
    updateMomentFeedApplicationState(input: UpdateMomentFeedApplicationStateInput!): User! @auth(mode: "${AUTH_MODE.admin}") @purgeCache(type: "${NODE_TYPES.User}")
  }

  input MomentInput {
    shortHash: String!
  }

  input PutMomentInput {
    content: String!
    tags: [String!]
    articles: [ID!]
    assets: [ID!]
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

  input MomentFeedUsersInput {
    after: String
    first: Int @constraint(min: 0)
    states: [MomentFeedUserState!]
    userName: String
  }

  input UpdateMomentFeedApplicationStateInput {
    id: ID!
    state: MomentFeedUserState!
  }

  type Moment implements Node {
    id: ID!
    shortHash: String!
    content: String
    assets: [Asset!]!
    tags: [Tag]!
    articles: [Article!]!
    author: User! @logCache(type: "${NODE_TYPES.User}")

    state: MomentState!

    commentCount: Int!
    commentedFollowees: [User!]!
    comments(input: CommentsInput!): CommentConnection! @complexity(multipliers: ["input.first"], value: 1)

    likeCount: Int!
    """whether current user has liked it"""
    liked: Boolean! @privateCache

    spamStatus: SpamStatus! @auth(mode: "${AUTH_MODE.admin}")
    adStatus: AdStatus! @auth(mode: "${AUTH_MODE.admin}")

    createdAt: DateTime!
  }

  enum MomentState {
    active
    archived
  }

  type MomentConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [MomentEdge!]
  }

  type MomentEdge {
    cursor: String!
    node: Moment! @logCache(type: "${NODE_TYPES.Moment}")
  }

  type MomentFeedApplication {
    state: MomentFeedUserState!
    reviewedBy: MomentFeedUserReviewedBy
    reviewer: User
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum MomentFeedUserState {
    pending
    approved
    rejected
    revoked
  }

  enum MomentFeedUserReviewedBy {
    admin
    system
    seed
  }
`
