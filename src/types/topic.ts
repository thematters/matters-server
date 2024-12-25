import { AUTH_MODE, CACHE_TTL } from 'common/enums'

export default /* GraphQL */ `
  extend type Query {
    topics: [Topic!]! @cacheControl(maxAge: ${CACHE_TTL.MEDIUM})
  }

  type Topic {
    id: ID!
    name(input: TranslationArgs): String!
  }

  extend type Mutation {
    setArticleTopics(input: SetArticleTopicsInput!): Article! @auth(mode: "${AUTH_MODE.admin}")
  }

  input SetArticleTopicsInput {
    id: ID!
    topics: [ID!]!
  }
`
