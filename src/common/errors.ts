import { ApolloError } from 'apollo-server-express'

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
    super(message, 'INTERNAL_SERVER_ERROR', properties)

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

export class ActionFailedError extends ApolloError {
  constructor(message: string) {
    super(message, 'ACTION_FAILED')

    Object.defineProperty(this, 'name', { value: 'ActionFailed' })
  }
}

export class UnableToUploadFromUrl extends ApolloError {
  constructor(message: string, properties?: Record<string, any>) {
    super(message, 'UNABLE_TO_UPLOAD_FROM_URL', properties)

    Object.defineProperty(this, 'name', { value: 'UnableToUploadFromUrl' })
  }
}

export class NameInvalidError extends ApolloError {
  constructor(message: string) {
    super(message, 'NAME_INVALID')

    Object.defineProperty(this, 'name', { value: 'NameInvalidError' })
  }
}

export class NameExistsError extends ApolloError {
  constructor(message: string) {
    super(message, 'NAME_EXISTS')

    Object.defineProperty(this, 'name', { value: 'NameExistsError' })
  }
}

export class DisplayNameInvalidError extends ApolloError {
  constructor(message: string) {
    super(message, 'DISPLAYNAME_INVALID')

    Object.defineProperty(this, 'name', { value: 'DisplayNameInvalidError' })
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

export class ForbiddenByStateError extends ApolloError {
  constructor(message: string) {
    super(message, 'FORBIDDEN_BY_STATE')

    Object.defineProperty(this, 'name', { value: 'ForbiddenByStateError' })
  }
}

export class ForbiddenByTargetStateError extends ApolloError {
  constructor(message: string) {
    super(message, 'FORBIDDEN_BY_TARGET_STATE')

    Object.defineProperty(this, 'name', {
      value: 'ForbiddenByTargetStateError',
    })
  }
}

export class TokenInvalidError extends ApolloError {
  constructor(message: string) {
    super(message, 'TOKEN_INVALID')

    Object.defineProperty(this, 'name', { value: 'TokenInvalidError' })
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

export class CircleNotFoundError extends ApolloError {
  constructor(message: string) {
    super(message, 'CIRCLE_NOT_FOUND')

    Object.defineProperty(this, 'name', { value: 'CircleNotFoundError' })
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

export class ArticleRevisionContentInvalidError extends ApolloError {
  constructor(message: string) {
    super(message, 'ARTICLE_REVISION_CONTENT_INVALID')

    Object.defineProperty(this, 'name', {
      value: 'ArticleRevisionContentInvalidError',
    })
  }
}

export class ArticleRevisionReachLimitError extends ApolloError {
  constructor(message: string) {
    super(message, 'ARTICLE_REVISION_REACH_LIMIT')

    Object.defineProperty(this, 'name', {
      value: 'ArticleRevisionReachLimitError',
    })
  }
}

/*********************************
 *                               *
 *              Tag              *
 *                               *
 *********************************/
export class DuplicateTagError extends ApolloError {
  constructor(message: string) {
    super(message, 'DUPLICATE_TAG')

    Object.defineProperty(this, 'name', { value: 'DuplicateTagError' })
  }
}

export class TagEditorsReachLimitError extends ApolloError {
  constructor(message: string) {
    super(message, 'TAG_EDITORS_REACH_LIMIT')

    Object.defineProperty(this, 'name', { value: 'TagEditorsReachLimitError' })
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

export class UserFollowFailedError extends ApolloError {
  constructor(message: string) {
    super(message, 'USER_FOLLOW_FAILED')

    Object.defineProperty(this, 'name', { value: 'UserFollowFailedError' })
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

/*********************************
 *                               *
 *            LikeCoin           *
 *                               *
 *********************************/
export class LikerNotFoundError extends ApolloError {
  constructor(message: string) {
    super(message, 'LIKER_NOT_FOUND')

    Object.defineProperty(this, 'name', { value: 'LikerNotFoundError' })
  }
}

export class LikerEmailExistsError extends ApolloError {
  constructor(message: string) {
    super(message, 'LIKER_EMAIL_EXISTS')

    Object.defineProperty(this, 'name', { value: 'LikerEmailExistsError' })
  }
}

export class LikerUserIdExistsError extends ApolloError {
  constructor(message: string) {
    super(message, 'LIKER_USER_ID_EXISTS')

    Object.defineProperty(this, 'name', { value: 'LikerUserIdExistsError' })
  }
}

/*********************************
 *                               *
 *             OAuth             *
 *                               *
 *********************************/
export class OAuthTokenInvalidError extends ApolloError {
  constructor(message: string) {
    super(message, 'OAUTH_TOKEN_INVALID')

    Object.defineProperty(this, 'name', { value: 'OAuthTokenInvalidError' })
  }
}

/*********************************
 *                               *
 *            Migration          *
 *                               *
 *********************************/
export class MigrationReachLimitError extends ApolloError {
  constructor(message: string) {
    super(message, 'MIGRATION_REACH_LIMIT')

    Object.defineProperty(this, 'name', { value: 'MigrationReachLimit' })
  }
}

/*********************************
 *                               *
 *             Payment           *
 *                               *
 *********************************/
export class PaymentAmountTooSmallError extends ApolloError {
  constructor(message: string) {
    super(message, 'PAYMENT_AMOUNT_TOO_SMALL')
    Object.defineProperty(this, 'name', { value: 'PaymentAmountTooSmall' })
  }
}

export class PaymentAmountInvalidError extends ApolloError {
  constructor(message: string) {
    super(message, 'PAYMENT_AMOUNT_INVALID')
    Object.defineProperty(this, 'name', { value: 'PaymentAmountInvalid' })
  }
}

export class PaymentBalanceInsufficientError extends ApolloError {
  constructor(message: string) {
    super(message, 'PAYMENT_BALANCE_INSUFFICIENT')
    Object.defineProperty(this, 'name', { value: 'PaymentBalanceInsufficient' })
  }
}

export class PaymentReachMaximumLimitError extends ApolloError {
  constructor(message: string) {
    super(message, 'PAYMENT_REACH_MAXIMUM_LIMIT')
    Object.defineProperty(this, 'name', {
      value: 'PaymentReachMaximumLimitError',
    })
  }
}

export class PaymentPayoutAccountExistsError extends ApolloError {
  constructor(message: string) {
    super(message, 'PAYMENT_PAYOUT_ACCOUNT_EXISTS')
    Object.defineProperty(this, 'name', {
      value: 'PaymentPayoutAccountExistsError',
    })
  }
}

export class PaymentPayoutTransactionExistsError extends ApolloError {
  constructor(message: string) {
    super(message, 'PAYMENT_PAYOUT_TRANSACTION_EXISTS')
    Object.defineProperty(this, 'name', {
      value: 'PaymentPayoutTransactionExistsError',
    })
  }
}

export class PaymentPasswordNotSetError extends ApolloError {
  constructor(message: string) {
    super(message, 'PAYMENT_PASSWORD_NOT_SET')
    Object.defineProperty(this, 'name', {
      value: 'PaymentPasswordNotSetError',
    })
  }
}

export class PaymentQueueJobDataError extends ApolloError {
  constructor(message: string) {
    super(message, 'PAYMENT_QUEUE_JOB_DATA_ERROR')
    Object.defineProperty(this, 'name', {
      value: 'PaymentQueueJobDataError',
    })
  }
}

/*********************************
 *                               *
 *            Circle             *
 *                               *
 *********************************/
export class DuplicateCircleError extends ApolloError {
  constructor(message: string) {
    super(message, 'DUPLICATE_CIRCLE')

    Object.defineProperty(this, 'name', { value: 'DuplicateCircleError' })
  }
}

export class DuplicateCircleSubscriptionError extends ApolloError {
  constructor(message: string) {
    super(message, 'DUPLICATE_CIRCLE_SUBSCRIPTION')

    Object.defineProperty(this, 'name', { value: 'DuplicateCircleSubscriptionError' })
  }
}
