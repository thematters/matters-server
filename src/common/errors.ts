import { ApolloError } from 'apollo-server'

/*********************************
 *                               *
 *             Common            *
 *                               *
 *********************************/
export class UnknownError extends ApolloError {
  constructor(message: string, properties?: Record<string, any>) {
    super(message, 'UNKNOWN_ERROR', properties)

    Object.defineProperty(this, 'name', { value: 'UnknownError' })
  }
}

export class NetworkError extends ApolloError {
  constructor(message: string, properties?: Record<string, any>) {
    super(message, 'NETWORK_ERROR', properties)

    Object.defineProperty(this, 'name', { value: 'NetworkError' })
  }
}

export class ServerError extends ApolloError {
  constructor(message: string, properties?: Record<string, any>) {
    super(message, 'SERVER_ERROR', properties)

    Object.defineProperty(this, 'name', { value: 'ServerError' })
  }
}

export class UserInputError extends ApolloError {
  constructor(message: string, properties?: Record<string, any>) {
    super(message, 'BAD_USER_INPUT', properties)

    Object.defineProperty(this, 'name', { value: 'UserInputError' })
  }
}

export class ActionLimitExceededError extends ApolloError {
  constructor(message: string, properties?: Record<string, any>) {
    super(message, 'ACTION_LIMIT_EXCEEDED', properties)

    Object.defineProperty(this, 'name', { value: 'ActionLimitExceededError' })
  }
}

/*********************************
 *                               *
 *             Auth              *
 *                               *
 *********************************/
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

/*********************************
 *                               *
 *           Entity              *
 *                               *
 *********************************/
export class EntityNotFoundError extends ApolloError {
  constructor(message: string) {
    super(message, 'ENTITY_NOT_FOUND')

    Object.defineProperty(this, 'name', { value: 'EntityNotFoundError' })
  }
}

export class UserNotFoundError extends ApolloError {
  constructor(message: string) {
    super(message, 'USER_NOT_FOUND')

    Object.defineProperty(this, 'name', { value: 'UserNotFoundError' })
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

export class AssetNotFoundError extends ApolloError {
  constructor(message: string) {
    super(message, 'ASSET_NOT_FOUND')

    Object.defineProperty(this, 'name', { value: 'AssetNotFoundError' })
  }
}

export class DraftNotFoundError extends ApolloError {
  constructor(message: string) {
    super(message, 'DRAFT_NOT_FOUND')

    Object.defineProperty(this, 'name', { value: 'DraftNotFoundError' })
  }
}

export class AudioDraftNotFoundError extends ApolloError {
  constructor(message: string) {
    super(message, 'AUDIO_DRAFT_NOT_FOUND')

    Object.defineProperty(this, 'name', { value: 'AudioDraftNotFoundError' })
  }
}

export class TagNotFoundError extends ApolloError {
  constructor(message: string) {
    super(message, 'TAG_NOT_FOUND')

    Object.defineProperty(this, 'name', { value: 'TagNotFoundError' })
  }
}

export class NoticeNotFoundError extends ApolloError {
  constructor(message: string) {
    super(message, 'NOTICE_NOT_FOUND')

    Object.defineProperty(this, 'name', { value: 'NoticeNotFoundError' })
  }
}

/*********************************
 *                               *
 *           Article             *
 *                               *
 *********************************/
export class NotEnoughMatError extends ApolloError {
  constructor(message: string) {
    super(message, 'NOT_ENOUGH_MAT')

    Object.defineProperty(this, 'name', { value: 'NotEnoughMatError' })
  }
}

/*********************************
 *                               *
 *           Comment             *
 *                               *
 *********************************/
export class CommentVoteNotFoundError extends ApolloError {
  constructor(message: string) {
    super(message, 'COMMENT_VOTE_NOT_FOUND')

    Object.defineProperty(this, 'name', { value: 'CommentVoteNotFoundError' })
  }
}

/*********************************
 *                               *
 *             User              *
 *                               *
 *********************************/
export class EmailInvalidError extends ApolloError {
  constructor(message: string) {
    super(message, 'USER_EMAIL_INVALID')

    Object.defineProperty(this, 'name', { value: 'EmailInvalidError' })
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

export class UsernameExistsError extends ApolloError {
  constructor(message: string) {
    super(message, 'USER_USERNAME_EXISTS')

    Object.defineProperty(this, 'name', { value: 'UsernameExistsError' })
  }
}

export class DisplayNameInvalidError extends ApolloError {
  constructor(message: string) {
    super(message, 'USER_DISPLAYNAME_INVALID')

    Object.defineProperty(this, 'name', { value: 'DisplayNameInvalidError' })
  }
}

export class UserFollowFailedError extends ApolloError {
  constructor(message: string) {
    super(message, 'USER_FOLLOW_FAILED')

    Object.defineProperty(this, 'name', { value: 'UserFollowFailedError' })
  }
}

export class UserInviteFailedError extends ApolloError {
  constructor(message: string) {
    super(message, 'USER_INVITE_FAILED')

    Object.defineProperty(this, 'name', { value: 'UserInviteFailedError' })
  }
}

export class UserInviteStateFailedError extends ApolloError {
  constructor(message: string) {
    super(message, 'USER_INVITE_STATE_INVALID')

    Object.defineProperty(this, 'name', { value: 'UserInviteStateFailedError' })
  }
}

export class UserInviteEmailRegisteredFailedError extends ApolloError {
  constructor(message: string) {
    super(message, 'USER_INVITE_EMAIL_REGISTERED')

    Object.defineProperty(this, 'name', {
      value: 'UserInviteEmailRegisteredFailedError'
    })
  }
}

/*********************************
 *                               *
 *      Verification Code        *
 *                               *
 *********************************/
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
