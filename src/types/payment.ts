export default /* GraphQL */ `
  extend type Mutation {
    "Add Credit to User Wallet"
    addCredit(input: AddCreditInput!): AddCreditResult! @authenticate

    "Pay to another user or article"
    payTo(input: PayToInput!): PayToResult! @authenticate

    "Create Stripe Connect account for Payout"
    connectStripeAccount: ConnectStripeAccountResult! @authenticate
  }

  extend type User {
    "User Wallet"
    wallet: Wallet! @scope
  }

  union TransactionTarget = Article | Transaction

  type Wallet {
    balance: Balance!
    transactions(input: TransactionsArgs!): TransactionConnection!
    stripeAccount: StripeAccount
  }

  type Balance {
    HKD: Float!
  }

  type Transaction {
    id: ID!

    state: TransactionState!

    purpose: TransactionPurpose!

    amount: Float!
    fee: NonNegativeFloat!

    currency: TransactionCurrency!

    "Timestamp of transaction."
    createdAt: DateTime!

    "Recipient of transaction."
    recipient: User

    "Sender of transaction."
    sender: User

    "Related target article or transaction."
    target: TransactionTarget
  }

  type TransactionConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [TransactionEdge!]
  }

  type TransactionEdge {
    cursor: String!
    node: Transaction!
  }

  input TransactionsArgs {
    after: String
    first: Int
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
  }

  enum TransactionCurrency {
    HKD
    LIKE
  }

  # Add Credit
  input AddCreditInput {
    amount: PositiveFloat!
  }

  type AddCreditResult {
    transaction: Transaction!

    "The client secret of this PaymentIntent."
    client_secret: String!
  }

  # Pay To
  input PayToInput {
    amount: PositiveFloat!
    currency: TransactionCurrency!
    purpose: TransactionPurpose!
    recipientId: ID!
    targetId: ID
    password: String
  }

  type PayToResult {
    transaction: Transaction!

    "Only available when paying with LIKE."
    redirectUrl: URL
  }

  # Stripe Account
  type StripeAccount {
    id: ID!
    loginUrl: URL!
  }

  type ConnectStripeAccountResult {
    redirectUrl: URL!
  }
`
