import { AUTH_MODE, CACHE_TTL } from 'common/enums'

export default /* GraphQL */ `
  extend type Query {
    channels: [Channel!]! @cacheControl(maxAge: ${CACHE_TTL.MEDIUM})
  }

  type Channel {
    id: ID!
    name(input: TranslationArgs): String!
  }

  extend type Mutation {
    setArticleChannels(input: SetArticleChannelsInput!): Article! @auth(mode: "${AUTH_MODE.admin}")
  }

  input SetArticleChannelsInput {
    id: ID!
    channels: [ID!]!
  }
`
