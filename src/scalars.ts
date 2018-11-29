import { GraphQLDate, GraphQLTime, GraphQLDateTime } from 'graphql-iso-date'
import GraphQLJSON from 'graphql-type-json'
import * as GraphQLUpload from 'graphql-upload'

export const types = /* GraphQL */ `
  scalar Date
  scalar Time
  scalar DateTime
  scalar JSON
  scalar Upload
`

export const resolvers = {
  Date: GraphQLDate,
  Time: GraphQLTime,
  DateTime: GraphQLDateTime,
  JSON: GraphQLJSON,
  Upload: GraphQLUpload
}
