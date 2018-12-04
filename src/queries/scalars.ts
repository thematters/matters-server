import { GraphQLDate, GraphQLTime, GraphQLDateTime } from 'graphql-iso-date'
import GraphQLJSON from 'graphql-type-json'
import * as GraphQLUpload from 'graphql-upload'
import { GraphQLEmail, GraphQLURL, GraphQLUUID } from 'graphql-custom-types'

export default {
  Date: GraphQLDate,
  Time: GraphQLTime,
  DateTime: GraphQLDateTime,
  JSON: GraphQLJSON,
  Upload: GraphQLUpload,
  UUID: GraphQLUUID,
  Email: GraphQLEmail,
  URL: GraphQLURL
}
