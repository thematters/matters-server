import { ApolloError } from 'apollo-server-express'
import { GraphQLDate, GraphQLTime, GraphQLDateTime } from 'graphql-iso-date'
import GraphQLJSON from 'graphql-type-json'
import * as GraphQLUpload from 'graphql-upload'
import { GraphQLUUID } from 'graphql-custom-types'
import {
  NonPositiveInt,
  PositiveInt,
  NonNegativeInt,
  NegativeInt,
  NonPositiveFloat,
  PositiveFloat,
  NonNegativeFloat,
  NegativeFloat,
  EmailAddress,
  URL
} from '@okgrow/graphql-scalars'
import { EmailInvalidError } from 'common/errors'

const errorWrapper = (
  fn: (args: any) => any,
  CustomError: typeof ApolloError
) => (args: any) => {
  try {
    return fn(args)
  } catch (err) {
    throw new CustomError(err.message)
  }
}

const CustomEmailAddress = {
  serialize: errorWrapper(EmailAddress.serialize, EmailInvalidError),
  parseValue: errorWrapper(EmailAddress.parseValue, EmailInvalidError),
  parseLiteral: errorWrapper(
    EmailAddress.parseLiteral as (args: any) => any,
    EmailInvalidError
  ),
  ...EmailAddress
}

export default {
  Date: GraphQLDate,
  Time: GraphQLTime,
  DateTime: GraphQLDateTime,
  JSON: GraphQLJSON,
  Upload: GraphQLUpload,
  UUID: GraphQLUUID,
  Email: CustomEmailAddress,
  URL,
  NonPositiveInt,
  PositiveInt,
  NonNegativeInt,
  NegativeInt,
  NonPositiveFloat,
  PositiveFloat,
  NonNegativeFloat,
  NegativeFloat
}
