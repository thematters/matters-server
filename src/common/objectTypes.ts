// external
import { GraphQLScalarType } from 'graphql'
import { isISO8601 } from 'validator'

const parseISO8601 = (value: string) => {
  if (isISO8601(value)) {
    return value
  }
  throw new Error('DateTime cannot represent an invalid ISO-8601 Date string')
}

const serializeISO8601 = (value: string) => {
  if (isISO8601(value)) {
    return value
  }
  throw new Error('DateTime cannot represent an invalid ISO-8601 Date string')
}

const parseLiteralISO8601 = (ast: { [key: string]: any }) => {
  if (isISO8601(ast.value)) {
    return ast.value
  }
  throw new Error('DateTime cannot represent an invalid ISO-8601 Date string')
}

export const DateTimeType = new GraphQLScalarType({
  name: 'DateTime',
  description: 'An ISO-8601 encoded UTC date string.',
  serialize: serializeISO8601,
  parseValue: parseISO8601,
  parseLiteral: parseLiteralISO8601
})
