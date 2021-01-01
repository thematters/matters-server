import {
  AUTH_MODE as MODE,
  CACHE_TTL,
  NODE_TYPES as NODE,
  SCOPE_GROUP as GROUP,
} from 'common/enums'

export default `
  extend type Query {
    circle(input: CircleInput!): Circle @privateCache @logCache(type: "${NODE.circle}")
  }

  extend type Mutation {
    "Put a Circle."
    putCircle(input: PutCircleInput!): Circle! @auth(mode: "${MODE.oauth}", group: "${GROUP.level3}") @purgeCache(type: "${NODE.circle}")

    "Star or stop a Circle subscription."
    toggleCircleSubscription(input: ToggleItemInput!): Circle! @auth(mode: "${MODE.oauth}", group: "${GROUP.level1}") @purgeCache(type: "${NODE.circle}")

    "Follow or unfollow a Circle."
    toggleFollowCircle(input: ToggleItemInput!): Circle! @auth(mode: "${MODE.oauth}", group: "${GROUP.level1}") @purgeCache(type: "${NODE.circle}")
  }

  type Circle implements Node {
    "Unique ID."
    id: ID!

    "Circle avatar's link."
    avatar: URL

    "Circle cover's link."
    cover: URL

    "Slugified name of this Circle."
    name: String!

    "Human readable name of this Circle."
    displayName: String!

    "A short description of this Circle."
    description: String

    "Prices offered by this Circle."
    prices: [Price!]

    "Circle owner."
    owner: User! @logCache(type: "${NODE.user}")

    "List of Circle member."
    members(input: ConnectionArgs!): MemberConnection!

    "List of Circle follower."
    followers(input: ConnectionArgs!): UserConnection!

    "List of works belong to this Circle."
    works(input: ConnectionArgs!): ArticleConnection!

    "State of this Circle."
    state: CircleState!

    "Created time."
    createdAt: DateTime!

    "Updated time."
    updatedAt: DateTime!

    # Privae fields

    "This value determines if current viewer is following Circle or not."
    isFollower: Boolean!

    "This value determines if current viewer is Member or not."
    isMember: Boolean!

    "Setting of this Circle."
    setting: CircleSetting!
  }

  type CircleSetting {
    "Whether broadcast is enabled or not."
    enableBroadcast: Boolean!

    "Whther discussion is enabled or not."
    enableDiscussion: Boolean!
  }

  type Member {
    "User who join to a Circle."
    user: User! @logCache(type: "${NODE.user}")

    "Price chosen by user when joining a Circle."
    price: Price!
  }

  type Price {
    "Unique ID."
    id: ID!

    "Amount of Price."
    amount: NonNegativeFloat!

    "Current Price belongs to whcih Circle."
    circle: Circle!

    "Currency of Price."
    currency: TransactionCurrency!

    "Billing cycle of Price."
    billingCycle: PriceBillingCycle!

    "State of Price."
    state: PriceState!

    "Created time."
    createdAt: DateTime!

    "Updated time."
    updatedAt: DateTime!
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

  input CircleInput {
    "Slugified name of a Circle."
    name: String!
  }

  input PutCircleInput {
    "Unique ID."
    id: ID

    "Unique ID of a Circle's avatar."
    avatar: ID

    "Unique ID of a Circle's cover."
    cover: ID

    "Slugified name of a Circle."
    name: String

    "Human readable name of this Circle."
    displayName: String

    "A short description of this Circle."
    description: String

    "Circle's subscription fee."
    amount: NonNegativeFloat
  }

  input ToggleCircleMemberInput {
    "Unique ID."
    id: ID!

    "Toggle value."
    enabled: Boolean!

    "Unique ID of target user."
    targetId: ID!
  }

  enum CircleState {
    active
    archived
  }

  enum PriceBillingCycle {
    month
  }

  enum PriceState {
    active
    archived
  }
`
