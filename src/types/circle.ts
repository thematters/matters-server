import {
  AUTH_MODE as MODE,
  NODE_TYPES,
  NODE_TYPES as NODE,
  SCOPE_GROUP as GROUP,
} from 'common/enums'

export default /* GraphQL */ `
  extend type Query {
    circle(input: CircleInput!): Circle @privateCache @logCache(type: "${NODE.circle}")
  }

  extend type Mutation {
    "Create or update a Circle."
    putCircle(input: PutCircleInput!): Circle! @auth(mode: "${MODE.oauth}", group: "${GROUP.level3}") @purgeCache(type: "${NODE.circle}")

    "Follow or unfollow a Circle."
    toggleFollowCircle(input: ToggleItemInput!): Circle! @auth(mode: "${MODE.oauth}", group: "${GROUP.level1}") @purgeCache(type: "${NODE.circle}")

    "Subscribe a Circle."
    subscribeCircle(input: SubscribeCircleInput!): SubscribeCircleResult! @auth(mode: "${MODE.oauth}", group: "${GROUP.level3}")

    "Unsubscribe a Circle."
    unsubscribeCircle(input: UnsubscribeCircleInput!): Circle! @auth(mode: "${MODE.oauth}", group: "${GROUP.level3}") @purgeCache(type: "${NODE.circle}")

    "Add or remove Circle's articles"
    putCircleArticles(input: PutCircleArticlesInput!): Circle! @auth(mode: "${MODE.oauth}", group: "${GROUP.level1}") @purgeCache(type: "${NODE.circle}")

    "Invite others to join circle"
    invite(input: InviteCircleInput!): [Invitation!]
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

    "Invitations belonged to this Circle."
    invitations(input: ConnectionArgs!): InvitationConnection!

    "Invitation used by current viewer."
    invitedBy: Invitation
  }

  extend type User {
    "Circles belong to current user."
    ownCircles: [Circle!] @logCache(type: "${NODE_TYPES.circle}")

    "Circles whiches user has subscribed."
    subscribedCircles(input: ConnectionArgs!): CircleConnection! @logCache(type: "${NODE_TYPES.circle}")
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

    "State of Price."
    state: PriceState!

    "Created time."
    createdAt: DateTime!

    "Updated time."
    updatedAt: DateTime!
  }

  type CircleConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [CircleEdge!]
  }

  type CircleEdge {
    cursor: String!
    node: Circle! @logCache(type: "${NODE.circle}")
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
    freePeriod: PositiveInt!

    "Created time."
    createdAt: DateTime!

    "Sent time."
    sentAt: DateTime!

    "Determine it is accepted or not."
    accepted: Boolean!
  }

  type Person {
    email: Email!
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
  }

  input InviteCircleInput {
    invitees: [InviteCircleInvitee!]!
    freePeriod: PositiveInt!
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
`
