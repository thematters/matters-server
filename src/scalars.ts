import { GraphQLDate, GraphQLTime, GraphQLDateTime } from 'graphql-iso-date'

export const types = /* GraphQL */ `
  scalar Date
  scalar Time
  scalar DateTime
`

export const resolvers = {
  Date: GraphQLDate,
  Time: GraphQLTime,
  DateTime: GraphQLDateTime
}
