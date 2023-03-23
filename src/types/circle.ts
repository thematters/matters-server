import {
  AUTH_MODE,
  CACHE_TTL,
  NODE_TYPES,
  SCOPE_GROUP,
} from 'common/enums/index.js'

export default /* GraphQL */ `
  extend type Query {
    circle(input: CircleInput!): Circle @privateCache @logCache(type: "${NODE_TYPES.Circle}")
  }

  extend type Mutation {
    "Create or update a Circle."
    putCircle(input: PutCircleInput!): Circle! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level3}") @purgeCache(type: "${NODE_TYPES.Circle}")

    "Follow or unfollow a Circle."
    toggleFollowCircle(input: ToggleItemInput!): Circle! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.Circle}") @deprecated(reason: "No longer in use")

    "Subscribe a Circle."
    subscribeCircle(input: SubscribeCircleInput!): SubscribeCircleResult! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level3}")

    "Unsubscribe a Circle."
    unsubscribeCircle(input: UnsubscribeCircleInput!): Circle! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level3}") @purgeCache(type: "${NODE_TYPES.Circle}")

    "Add or remove Circle's articles"
    putCircleArticles(input: PutCircleArticlesInput!): Circle! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level1}") @purgeCache(type: "${NODE_TYPES.Circle}") @deprecated(reason: "No longer in use")

    "Invite others to join circle"
    invite(input: InviteCircleInput!): [Invitation!]
  }

  type Circle implements Node {
    "Unique ID."
    id: ID!

    "Circle avatar's link."
    avatar: String @deprecated(reason: "No longer in use")

    "Circle cover's link."
    cover: String @deprecated(reason: "No longer in use")

    "Slugified name of this Circle."
    name: String! @deprecated(reason: "No longer in use")

    "Human readable name of this Circle."
    displayName: String! @deprecated(reason: "No longer in use")

    "A short description of this Circle."
    description: String

    "Prices offered by this Circle."
    prices: [Price!]

    "Circle owner."
    owner: User! @logCache(type: "${NODE_TYPES.User}")

    "List of Circle member."
    members(input: ConnectionArgs!): MemberConnection! @cost(multipliers: ["input.first"], useMultipliers: true) @deprecated(reason: "No longer in use")

    "List of Circle follower."
    followers(input: ConnectionArgs!): UserConnection! @cost(multipliers: ["input.first"], useMultipliers: true) @deprecated(reason: "No longer in use")

    "List of works belong to this Circle."
    works(input: ConnectionArgs!): ArticleConnection! @cost(multipliers: ["input.first"], useMultipliers: true) @deprecated(reason: "No longer in use")

    "State of this Circle."
    state: CircleState! @deprecated(reason: "No longer in use")

    "Created time."
    createdAt: DateTime! @deprecated(reason: "No longer in use")

    "Updated time."
    updatedAt: DateTime! @deprecated(reason: "No longer in use")

    # Privae fields

    "This value determines if current viewer is following Circle or not."
    isFollower: Boolean! @deprecated(reason: "No longer in use")

    "This value determines if current viewer is Member or not."
    isMember: Boolean! @deprecated(reason: "No longer in use")


    "Invitations belonged to this Circle."
    invites: Invites!

    "Invitation used by current viewer."
    invitedBy: Invitation

    "Analytics dashboard."
    analytics: CircleAnalytics! @cacheControl(maxAge: ${CACHE_TTL.ANALYTICS})
  }

  extend type User {
    "Circles belong to current user."
    ownCircles: [Circle!] @logCache(type: "${NODE_TYPES.Circle}")

    "Circles whiches user has subscribed."
    subscribedCircles(input: ConnectionArgs!): CircleConnection! @cost(multipliers: ["input.first"], useMultipliers: true) @logCache(type: "${NODE_TYPES.Circle}")
  }

  type Member {
    "User who join to a Circle."
    user: User! @logCache(type: "${NODE_TYPES.User}")

    "Price chosen by user when joining a Circle."
    price: Price!
  }

  type Price {
    "Unique ID."
    id: ID!

    "Amount of Price."
    amount: Float!

    "Current Price belongs to whcih Circle."
    circle: Circle!

    "Currency of Price."
    currency: TransactionCurrency!

    "State of Price."
    state: PriceState!

    "Created time."
    createdAt: DateTime! @deprecated(reason: "No longer in use")

    "Updated time."
    updatedAt: DateTime! @deprecated(reason: "No longer in use")
  }

  type CircleConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [CircleEdge!]
  }

  type CircleEdge {
    cursor: String!
    node: Circle! @logCache(type: "${NODE_TYPES.Circle}")
  }

  type MemberConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [MemberEdge!]
  }

  type MemberEdge {
    cursor: String!
    node: Member!
  }

  type SubscribeCircleResult {
    circle: Circle!

    "client secret for SetupIntent."
    client_secret: String
  }

  type Invites {
    "Accepted invitation list"
    accepted(input: ConnectionArgs!): InvitationConnection! @cost(multipliers: ["input.first"], useMultipliers: true)

    "Pending invitation list"
    pending(input: ConnectionArgs!): InvitationConnection! @cost(multipliers: ["input.first"], useMultipliers: true)
  }

  type Invitation {
    "Unique ID."
    id: ID!

    "Target person of this invitation."
    invitee: Invitee!

    "Creator of this invitation."
    inviter: User!

    "Invitation of current Circle."
    circle: Circle!

    "Free period of this invitation."
    freePeriod: Int!

    "Created time."
    createdAt: DateTime!

    "Sent time."
    sentAt: DateTime!

    "Accepted time."
    acceptedAt: DateTime

    "Determine it's specific state."
    state: InvitationState!
  }

  type Person {
    email: String! @constraint(format: "email")
  }

  union Invitee = Person | User

  type InvitationConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [InvitationEdge!]
  }

  type InvitationEdge {
    cursor: String!
    node: Invitation!
  }

  type CircleAnalytics {
    income: CircleIncomeAnalytics!
    subscriber: CircleSubscriberAnalytics!
    follower: CircleFollowerAnalytics!
    content: CircleContentAnalytics!
  }

  type CircleIncomeAnalytics {
    "income history of last 4 months"
    history: [MonthlyDatum!]!

    "total income of all time"
    total: Float!

    "income of this month"
    thisMonth: Float!

    "income of next month"
    nextMonth: Float!
  }

  type CircleSubscriberAnalytics {
    "subscriber count history of last 4 months"
    subscriberHistory: [MonthlyDatum!]!

    "invitee count history of last 4 months"
    inviteeHistory: [MonthlyDatum!]!

    "current subscriber count"
    currentSubscriber: Int!

    "current invitee count"
    currentInvitee: Int!
  }

  type CircleFollowerAnalytics {
    "subscriber count history of last 4 months"
    history: [MonthlyDatum!]!

    "current follower count"
    current: Int!

    "the percentage of follower count in reader count of circle articles"
    followerPercentage: Float!
  }

  type CircleContentAnalytics {
    public: [CircleContentAnalyticsDatum!]
    paywall: [CircleContentAnalyticsDatum!]
  }

  type CircleContentAnalyticsDatum {
    node: Article!
    readCount: Int!
  }

  type MonthlyDatum {
    value: Float!
    date: DateTime!
  }

  input CircleInput {
    "Slugified name of a Circle."
    name: String!
  }

  input PutCircleInput {
    "Unique ID."
    id: ID

    "Unique ID of a Circle's avatar."
    avatar: ID # @deprecated(reason: "No longer in use")

    "Unique ID of a Circle's cover."
    cover: ID # @deprecated(reason: "No longer in use")

    "Slugified name of a Circle."
    name: String # @deprecated(reason: "No longer in use")

    "Human readable name of this Circle."
    displayName: String # @deprecated(reason: "No longer in use")

    "A short description of this Circle."
    description: String

    "Circle's subscription fee."
    amount: Float @constraint(exclusiveMin: 0)
  }

  input ToggleCircleMemberInput {
    "Unique ID."
    id: ID!

    "Toggle value."
    enabled: Boolean!

    "Unique ID of target user."
    targetId: ID!
  }

  input SubscribeCircleInput {
    "Unique ID."
    id: ID!

    "Wallet password."
    password: String
  }

  input UnsubscribeCircleInput {
    "Unique ID."
    id: ID!
  }

  input PutCircleArticlesInput {
    "Circle ID"
    id: ID!

    "Article Ids"
    articles: [ID!]

    "Action Type"
    type: PutCircleArticlesType!

    "Access Type, \`public\` or \`paywall\` only."
    accessType: ArticleAccessType!

    license: ArticleLicenseType
  }

  input InviteCircleInput {
    invitees: [InviteCircleInvitee!]!
    freePeriod: Int! @constraint(exclusiveMin: 0)
    circleId: ID!
  }

  input InviteCircleInvitee {
    id: ID
    email: String
  }

  enum CircleState {
    active
    archived
  }

  enum PriceState {
    active
    archived
  }

  enum PutCircleArticlesType {
    add
    remove
  }

  enum InvitationState {
    accepted
    pending
    transfer_succeeded
    transfer_failed
  }
`
