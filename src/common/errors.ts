import { ApolloError } from 'apollo-server'

export class UserInputError extends ApolloError {
  constructor(message: string, properties?: Record<string, any>) {
    super(message, 'BAD_USER_INPUT', properties)

    Object.defineProperty(this, 'name', { value: 'UserInputError' })
  }
}

export class AuthenticationError extends ApolloError {
  constructor(message: string) {
    super(message, 'UNAUTHENTICATED')

    Object.defineProperty(this, 'name', { value: 'AuthenticationError' })
  }
}

export class ForbiddenError extends ApolloError {
  constructor(message: string) {
    super(message, 'FORBIDDEN')

    Object.defineProperty(this, 'name', { value: 'ForbiddenError' })
  }
}
