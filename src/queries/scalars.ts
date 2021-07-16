import {
  DateTimeResolver,
  NonNegativeFloatResolver,
  NonNegativeIntResolver,
  PositiveFloatResolver,
  PositiveIntResolver,
} from 'graphql-scalars'
import * as GraphQLUpload from 'graphql-upload'

export default {
  DateTime: DateTimeResolver,
  Upload: GraphQLUpload,
  PositiveInt: PositiveIntResolver,
  NonNegativeInt: NonNegativeIntResolver,
  PositiveFloat: PositiveFloatResolver,
  NonNegativeFloat: NonNegativeFloatResolver,
}
