import { AUTH_MODE, CACHE_TTL, NODE_TYPES, SCOPE_GROUP } from 'common/enums'

export default `
  extend type Query {
    circle(input: CircleInput!): Circle @privateCache @logCache(type: "${NODE_TYPES.circle}")
  }

  type Circle implements Node {
    "Unique ID."
    id: ID!

    "Circle avatar's link."
    avatar: URL

    "Circle cover's link."
    cover: URL

    "Slugified name of this Circle."
    circleName: String!

    "Human readable name of this Circle."
    displayName: String!

    "A short description of this Circle."
    description: String

    "Prices offered by this Circle."
    prices: [Price!] @logCache(type: "${NODE_TYPES.price}")

    "Circle owner."
    owner: User! @logCache(type: "${NODE_TYPES.user}")

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
    setting: CircleSetting @auth(mode: "${AUTH_MODE.oauth}")
  }

  type CircleSetting {
    "Whether broadcast is enabled or not."
    enableBroadcast: Boolean!

    "Whther discussion is enabled or not."
    enableDiscussion: Boolean!
  }

  type Member {
    "User who join to a Circle."
    user: User! @logCache(type: "${NODE_TYPES.user}")

    "Price chosen by user when joining a Circle."
    price: Price!

    "This value determines if this member is invited by owner or not."
    isInvited: Boolean! @auth(mode: "${AUTH_MODE.oauth}")
  }

  type Price {
    "Unique ID."
    id: ID!

    "Name of Price."
    name: String!

    "Amount of Price."
    amount: NonNegativeFloat!

    "Currency of Price."
    currency: TransactionCurrency!

    "Billing cycle of Price."
    billingCycle: PriceBillingCycle

    "Current Price belongs to whcih Circle."
    belongTo: Circle!

    "State of Price."
    state: PriceState
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
    name: String!
  }

  enum CircleState {
    active
    archived
  }

  enum PriceBillingCycle {
    monthly
  }

  enum PriceState {
    active
    archived
  }
`
