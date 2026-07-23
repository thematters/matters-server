import { AUTH_MODE, SCOPE_GROUP } from '#common/enums/index.js'

export default /* GraphQL */ `
  extend type Query {
    viewerFediverse: FediverseProfile! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @privateCache
    fediverseArticle(input: FediverseArticleInput!): FediverseArticle! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @privateCache
    fediverseRemoteActor(input: FediverseRemoteActorInput!): FediverseRemoteActor! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @privateCache
  }

  extend type Mutation {
    actFediverse(input: FediverseActionInput!): FediverseActionResult! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}")
    refreshFediverseProfile: Boolean! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}")
    pruneFediverseSocialData(input: PruneFediverseSocialDataInput): Boolean! @auth(mode: "${AUTH_MODE.admin}")
  }

  type FediverseProfile {
    actorId: String!
    handle: String!
    account: String!
    displayName: String!
    summary: String!
    profileUrl: String!
    avatarUrl: String
    headerUrl: String
    followersCount: Int!
    followingCount: Int!
    pendingFollowingCount: Int!
    unreadNotificationsCount: Int!
    maxFollowing: Int!
    retentionDays: Int!
    timelineMaxItems: Int!
    following: [FediverseRemoteActor!]!
    notifications: [FediverseNotification!]!
    timeline: [FediversePost!]!
  }

  type FediverseRemoteActor {
    actorId: String!
    account: String
    preferredUsername: String
    name: String
    summary: String!
    url: String!
    avatarUrl: String
    status: String
  }

  type FediverseNotification {
    id: ID!
    category: String!
    contentId: String
    objectId: String
    remoteActorIds: [String!]!
    headline: String
    preview: String
    eventCount: Int!
    unreadCount: Int!
    publishedAt: DateTime
  }

  type FediversePost {
    objectId: String!
    content: String!
    summary: String!
    url: String
    inReplyTo: String
    publishedAt: DateTime
    remoteActor: FediverseRemoteActor!
  }

  type FediverseArticle {
    contentId: String
    repliesCount: Int!
    likesCount: Int!
    announcesCount: Int!
    notificationsCount: Int!
    unreadNotificationsCount: Int!
    replies: [FediversePost!]!
  }

  type FediverseActionResult {
    status: String!
    mapping: String
    activityId: String
    remoteActorId: String
  }

  enum FediverseAction {
    follow
    unfollow
    reply
    like
    unlike
    announce
    unannounce
    block
    unblock
    report
    mark_read
  }

  input FediverseArticleInput {
    id: ID!
  }

  input FediverseRemoteActorInput {
    account: String @constraint(maxLength: 320)
    actorId: String @constraint(format: "uri", maxLength: 2048)
  }

  input FediverseActionInput {
    action: FediverseAction!
    account: String @constraint(maxLength: 320)
    remoteActorId: String @constraint(format: "uri", maxLength: 2048)
    objectId: String @constraint(format: "uri", maxLength: 2048)
    content: String @constraint(minLength: 1, maxLength: 500)
    activityId: String @constraint(format: "uri", maxLength: 2048)
    notificationIds: [ID!]
    reason: String @constraint(minLength: 3, maxLength: 500)
  }

  input PruneFediverseSocialDataInput {
    retentionDays: Int @constraint(min: 1, max: 365)
    maxItems: Int @constraint(min: 100, max: 10000)
  }
`
