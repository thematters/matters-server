declare module '@okgrow/graphql-scalars' {
  import { GraphQLScalarType } from 'graphql'

  export const EmailAddress: GraphQLScalarType
  export const DateTime: GraphQLScalarType
  export const NonPositiveInt: GraphQLScalarType
  export const PositiveInt: GraphQLScalarType
  export const NonNegativeInt: GraphQLScalarType
  export const NegativeInt: GraphQLScalarType
  export const NonPositiveFloat: GraphQLScalarType
  export const PositiveFloat: GraphQLScalarType
  export const NonNegativeFloat: GraphQLScalarType
  export const NegativeFloat: GraphQLScalarType
  export const URL: GraphQLScalarType
  export const PhoneNumber: GraphQLScalarType
  export const PostalCode: GraphQLScalarType

  export class RegularExpression extends GraphQLScalarType {
    constructor(name: string, regex: RegExp)
  }
}
