import { AUTH_MODE, NODE_TYPES } from '#common/enums/index.js'
import { isProd } from '#common/environment.js'

const PUT_QUOTE_RATE_LIMIT = isProd ? 6 : 30

export default /* GraphQL */ `
  extend type Mutation {
    "Post a quote (selected from an article) onto the campaign quote wall."
    putQuote(input: PutQuoteInput!): Quote! @auth(mode: "${AUTH_MODE.oauth}") @rateLimit(limit: ${PUT_QUOTE_RATE_LIMIT}, period: 300)

    "Retract a quote from the wall (poster, source article author, or admin)."
    deleteQuote(input: DeleteQuoteInput!): Boolean! @auth(mode: "${AUTH_MODE.oauth}")
  }

  extend type WritingChallenge {
    "Quotes on this campaign's quote wall (public)."
    quotes(input: QuotesInput!): QuoteConnection! @complexity(multipliers: ["input.first"], value: 1)

    "Quote count of this campaign's quote wall."
    quoteCount: Int!
  }

  input PutQuoteInput {
    articleId: ID!
    content: String!
  }

  input DeleteQuoteInput {
    id: ID!
  }

  input QuotesInput {
    first: Int @constraint(min: 0, max: 50)

    "random sampling for wall display; refetch to shuffle"
    random: Boolean
  }

  type Quote {
    id: ID!
    content: String!
    article: Article! @logCache(type: "${NODE_TYPES.Article}")

    "the user who posted this quote onto the wall"
    poster: User! @logCache(type: "${NODE_TYPES.User}")

    createdAt: DateTime!
  }

  type QuoteConnection implements Connection {
    totalCount: Int!
    pageInfo: PageInfo!
    edges: [QuoteEdge!]
  }

  type QuoteEdge {
    cursor: String!
    node: Quote!
  }
`
