import { AUTH_MODE, CACHE_TTL, NODE_TYPES, SCOPE_GROUP } from 'common/enums'

export default /* GraphQL */ `
  extend type Mutation {
    "Add Credit to User Wallet"
    addCredit(input: AddCreditInput!): AddCreditResult! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level3}")

    "Pay to another user or article"
    payTo(input: PayToInput!): PayToResult! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level3}")

    "Payout to user"
    payout(input: PayoutInput!): Transaction! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level3}")

    "Create Stripe Connect account for Payout"
    connectStripeAccount(input: ConnectStripeAccountInput!): ConnectStripeAccountResult! @auth(mode: "${AUTH_MODE.oauth}", group: "${SCOPE_GROUP.level3}")
  }

  extend type User {
    "User Wallet"
    wallet: Wallet! @auth(mode: "${AUTH_MODE.oauth}")

    "Payment pointer that resolves to Open Payments endpoints"
    paymentPointer: String
  }

  extend type UserStatus {
    "Whether user already set payment password."
    hasPaymentPassword: Boolean!

    "Number of articles donated by user"
    donatedArticleCount: Int!

    "Number of times of donations received by user"
    receivedDonationCount: Int!
  }

  union TransactionTarget = Article | Circle | Transaction

  type Wallet {
    balance: Balance! @cacheControl(maxAge: ${CACHE_TTL.INSTANT})

    transactions(input: TransactionsArgs!): TransactionConnection! @cost(multipliers: ["input.first"], useMultipliers: true)

    "Account of Stripe Connect to manage payout"
    stripeAccount: StripeAccount

    "URL of Stripe Dashboard to manage subscription invoice and payment method"
    customerPortal: String

    "The last four digits of the card."
    cardLast4: String
  }

  type Balance {
    HKD: Float!
  }

  type Transaction @cacheControl(maxAge: ${CACHE_TTL.INSTANT}) {
    id: ID!

    state: TransactionState!

    purpose: TransactionPurpose!

    amount: Float!
    fee: Float!

    currency: TransactionCurrency!

    "Timestamp of transaction."
    createdAt: DateTime!

    "Recipient of transaction."
    recipient: User

    "Sender of transaction."
    sender: User

    "Related target article or transaction."
    target: TransactionTarget @logCache(type: "${NODE_TYPES.TransactionTarget}")

    "Message for end user, including reason of failure."
    message: String

    "blockchain transaction info of USDT payment transaction"
    blockchainTx: BlockchainTransaction
  }

  type TransactionConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [TransactionEdge!]
  }

  type TransactionEdge {
    cursor: String!
    node: Transaction! @logCache(type: "${NODE_TYPES.Transaction}")
  }

  input TransactionsArgs {
    after: String
    first: Int @constraint(min: 0)
    id: ID
    states: [TransactionState!]
  }

  enum TransactionState {
    pending
    succeeded
    failed
    canceled
  }

  enum TransactionPurpose {
    donation
    addCredit
    refund
    payout
    subscriptionSplit
  }

  enum TransactionCurrency {
    HKD
    LIKE
    USDT
  }

  type AddCreditResult {
    transaction: Transaction!

    "The client secret of this PaymentIntent."
    client_secret: String!
  }

  type PayToResult {
    transaction: Transaction!

    "Only available when paying with LIKE."
    redirectUrl: String
  }

  # Add Credit
  input AddCreditInput {
    amount: Float! @constraint(exclusiveMin: 0)
  }

  input PayToInput {
    amount: Float! @constraint(exclusiveMin: 0)
    currency: TransactionCurrency!
    purpose: TransactionPurpose!
    recipientId: ID!
    targetId: ID
    "for HKD payment"
    password: String
    "for USDT payment"
    chain: Chain
    txHash: String
  }

  input PayoutInput {
    amount: Float! @constraint(exclusiveMin: 0)
    password: String!
  }

  # Stripe Account
  input ConnectStripeAccountInput {
    country: StripeAccountCountry!
  }

  type StripeAccount {
    id: ID!
    loginUrl: String! @cacheControl(maxAge: ${CACHE_TTL.INSTANT})
  }

  type ConnectStripeAccountResult {
    redirectUrl: String!
  }

  enum StripeAccountCountry {
    Australia
    Austria
    Belgium
    Bulgaria
    Canada
    Cyprus
    Denmark
    Estonia
    Finland
    France
    Germany
    Greece
    HongKong
    Ireland
    Italy
    Latvia
    Lithuania
    Luxembourg
    Malta
    Netherlands
    NewZealand
    Norway
    Poland
    Portugal
    Romania
    Singapore
    Slovakia
    Slovenia
    Spain
    Sweden
    UnitedKingdom
    UnitedStates
  }

  enum Chain {
    Polygon
  }

  type BlockchainTransaction {
    chain: Chain!
    txHash: String!
  }
`
