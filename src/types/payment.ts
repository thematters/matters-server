export default /* GraphQL */ `
  extend type Mutation {
    "Add Credit to User Wallet"
    addCredit(input: AddCreditInput!): AddCreditResult!

    "Pay to another user or article"
    payTo(input: PayToInput!): PayToResult!
  }

  extend type User {
    "User Wallet"
    wallet: Wallet!
  }

  type Wallet {
    balance: Balance!
    transactions(input: TransactionsArgs!): TransactionConnection!
  }

  type Balance {
    HKD: Int!
    LIKE: Int!
  }

  type Transaction {
    uuid: UUID!

    state: TransactionState!

    purpose: TransactionPurpose!

    amount: Int!

    currency: TransactionCurrency!

    "Timestamp of transaction."
    createdAt: DateTime!

    "Recipient of transaction."
    recipient: User!

    "Sender of transaction."
    sender: User

    "Article that transaction pay for."
    target: Article
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
    uuid: UUID
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
    fee
  }

  enum TransactionCurrency {
    HKD
    LIKE
  }

  # Add Credit
  input AddCreditInput {
    amount: PositiveInt!
  }

  type AddCreditResult {
    transaction: Transaction!

    "The client secret of this PaymentIntent."
    client_secret: String!
  }

  # Pay To
  input PayToInput {
    amount: PositiveInt!
    currency: TransactionCurrency!
    purpose: TransactionPurpose!
    recipientId: ID
    targetId: ID
    passcode: String!
  }

  type PayToResult {
    transaction: Transaction!

    "Only available when paying with LIKE."
    redirectUrl: URL
  }
`
