import { GraphQLUUID } from 'graphql-custom-types'
import {
  DateResolver,
  DateTimeResolver,
  EmailAddressResolver,
  JSONResolver,
  NegativeFloatResolver,
  NegativeIntResolver,
  NonNegativeFloatResolver,
  NonNegativeIntResolver,
  NonPositiveFloatResolver,
  NonPositiveIntResolver,
  PositiveFloatResolver,
  PositiveIntResolver,
  TimeResolver,
  URLResolver,
} from 'graphql-scalars'
import * as GraphQLUpload from 'graphql-upload'

export default {
  Date: DateResolver,
  Time: TimeResolver,
  DateTime: DateTimeResolver,
  JSON: JSONResolver,
  Upload: GraphQLUpload,
  UUID: GraphQLUUID,
  Email: EmailAddressResolver,
  URL: URLResolver,
  NonPositiveInt: NonPositiveIntResolver,
  PositiveInt: PositiveIntResolver,
  NonNegativeInt: NonNegativeIntResolver,
  NegativeInt: NegativeIntResolver,
  NonPositiveFloat: NonPositiveFloatResolver,
  PositiveFloat: PositiveFloatResolver,
  NonNegativeFloat: NonNegativeFloatResolver,
  NegativeFloat: NegativeFloatResolver,
}
