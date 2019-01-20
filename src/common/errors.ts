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

export class CommentNotFoundError extends ApolloError {
  constructor(message: string) {
    super(message, 'COMMENT_NOT_FOUND')

    Object.defineProperty(this, 'name', { value: 'CommentNotFoundError' })
  }
}

export class ArticleNotFoundError extends ApolloError {
  constructor(message: string) {
    super(message, 'ARTICLE_NOT_FOUND')

    Object.defineProperty(this, 'name', { value: 'ArticleNotFoundError' })
  }
}

export class EmailExistsError extends ApolloError {
  constructor(message: string) {
    super(message, 'USER_EMAIL_EXISTS')

    Object.defineProperty(this, 'name', { value: 'EmailExistsError' })
  }
}

export class EmailNotFoundError extends ApolloError {
  constructor(message: string) {
    super(message, 'USER_EMAIL_NOT_FOUND')

    Object.defineProperty(this, 'name', { value: 'EmailNotFoundError' })
  }
}

export class PasswordInvalidError extends ApolloError {
  constructor(message: string) {
    super(message, 'USER_PASSWORD_INVALID')

    Object.defineProperty(this, 'name', { value: 'PasswordInvalidError' })
  }
}

export class UsernameInvalidError extends ApolloError {
  constructor(message: string) {
    super(message, 'USER_USERNAME_INVALID')

    Object.defineProperty(this, 'name', { value: 'UsernameInvalidError' })
  }
}

export class CodeInvalidError extends ApolloError {
  constructor(message: string) {
    super(message, 'CODE_INVALID')

    Object.defineProperty(this, 'name', { value: 'CodeInvalidError' })
  }
}

export class CodeExpiredError extends ApolloError {
  constructor(message: string) {
    super(message, 'CODE_EXPIRED')

    Object.defineProperty(this, 'name', { value: 'CodeExpiredError' })
  }
}

export class NotEnoughMatError extends ApolloError {
  constructor(message: string) {
    super(message, 'NOT_ENOUGH_MAT')

    Object.defineProperty(this, 'name', { value: 'NotEnoughMatError' })
  }
}
