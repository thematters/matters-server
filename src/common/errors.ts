import { GraphQLError } from 'graphql'

// Error design document see https://paper.dropbox.com/doc/Error-Codes-for-GraphQL-API--B0_SdxSw3WrYTkjmzu7bKxLwAg-cUucb1Cllkj9O0lZhnnmj
// Note that the document is not longer maintained, but still provides useful infomation for error usage

/*********************************
 *                               *
 *             Common            *
 *                               *
 *********************************/
export class UnknownError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'UNKNOWN_ERROR' } })
  }
}

export class NetworkError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'NETWORK_ERROR' } })
  }
}

export class ServerError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'INTERNAL_SERVER_ERROR' } })
  }
}

export class UserInputError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'BAD_USER_INPUT' } })
  }
}

export class ActionLimitExceededError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'ACTION_LIMIT_EXCEEDED' } })
  }
}

export class ActionFailedError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'ACTION_FAILED' } })
  }
}

export class UnableToUploadFromUrl extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'UNABLE_TO_UPLOAD_FROM_URL' } })
  }
}

export class NameInvalidError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'NAME_INVALID' } })
  }
}

export class NameExistsError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'NAME_EXISTS' } })
  }
}

export class DisplayNameInvalidError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'DISPLAYNAME_INVALID' } })
  }
}

/*********************************
 *                               *
 *             Auth              *
 *                               *
 *********************************/
export class AuthenticationError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'UNAUTHENTICATED' } })
  }
}

export class ForbiddenError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'FORBIDDEN' } })
  }
}

export class ForbiddenByStateError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'FORBIDDEN_BY_STATE' } })
  }
}

export class ForbiddenByTargetStateError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'FORBIDDEN_BY_TARGET_STATE' } })
  }
}

export class TokenInvalidError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'TOKEN_INVALID' } })
  }
}

/*********************************
 *                               *
 *           Entity              *
 *                               *
 *********************************/
export class EntityNotFoundError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'ENTITY_NOT_FOUND' } })
  }
}

export class UserNotFoundError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'USER_NOT_FOUND' } })
  }
}

export class CommentNotFoundError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'COMMENT_NOT_FOUND' } })
  }
}

export class ArticleNotFoundError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'ARTICLE_NOT_FOUND' } })
  }
}

export class AssetNotFoundError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'ASSET_NOT_FOUND' } })
  }
}

export class DraftNotFoundError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'DRAFT_NOT_FOUND' } })
  }
}

export class TagNotFoundError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'TAG_NOT_FOUND' } })
  }
}

export class NoticeNotFoundError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'NOTICE_NOT_FOUND' } })
  }
}

export class CircleNotFoundError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'CIRCLE_NOT_FOUND' } })
  }
}

/*********************************
 *                               *
 *           Article             *
 *                               *
 *********************************/
export class NotEnoughMatError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'NOT_ENOUGH_MAT' } })
  }
}

export class ArticleRevisionContentInvalidError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'ARTICLE_REVISION_CONTENT_INVALID' } })
  }
}

export class ArticleRevisionReachLimitError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'ARTICLE_REVISION_REACH_LIMIT' } })
  }
}

export class ArticleCollectionReachLimitError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'ARTICLE_COLLECTION_REACH_LIMIT' } })
  }
}

/*********************************
 *                               *
 *              Tag              *
 *                               *
 *********************************/
export class DuplicateTagError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'DUPLICATE_TAG' } })
  }
}

export class TooManyTagsForArticleError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'TOO_MANY_TAGS_FOR_ARTICLE' } })
  }
}

export class TagEditorsReachLimitError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'TAG_EDITORS_REACH_LIMIT' } })
  }
}

export class NotAllowAddOfficialTagError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'NOT_ALLOW_ADD_OFFICIAL_TAG' } })
  }
}

/*********************************
 *                               *
 *             User              *
 *                               *
 *********************************/
export class EmailInvalidError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'USER_EMAIL_INVALID' } })
  }
}

export class EmailExistsError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'USER_EMAIL_EXISTS' } })
  }
}

export class EmailNotFoundError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'USER_EMAIL_NOT_FOUND' } })
  }
}

export class EthAddressNotFoundError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'USER_ETH_ADDRESS_NOT_FOUND' } })
  }
}

export class PasswordInvalidError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'USER_PASSWORD_INVALID' } })
  }
}

export class PasswordNotAvailableError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'USER_PASSWORD_NOT_AVAILABLE' } })
  }
}

export class UserFollowFailedError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'USER_FOLLOW_FAILED' } })
  }
}

export class CryptoWalletExistsError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'CRYPTO_WALLET_EXISTS' } })
  }
}

/*********************************
 *                               *
 *      Verification Code        *
 *                               *
 *********************************/
export class CodeInvalidError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'CODE_INVALID' } })
  }
}

export class CodeInactiveError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'CODE_INACTIVE' } })
  }
}

export class CodeExpiredError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'CODE_EXPIRED' } })
  }
}

/*********************************
 *                               *
 *            LikeCoin           *
 *                               *
 *********************************/
export class LikerNotFoundError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'LIKER_NOT_FOUND' } })
  }
}

export class LikerEmailExistsError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'LIKER_EMAIL_EXISTS' } })
  }
}

export class LikerUserIdExistsError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'LIKER_USER_ID_EXISTS' } })
  }
}

export class LikerISCNPublishWithoutWalletError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'LIKER_WALLET_NOT_EXISTS' } })
  }
}

export class LikerISCNPublishFailureError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'LIKER_ISCN_PUBLISH_FAILURE' } })
  }
}

export class LikeCoinWebhookError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'LIKECOIN_WEBHOOK_ERROR' } })
  }
}

/*********************************
 *                               *
 *             OAuth             *
 *                               *
 *********************************/
export class OAuthTokenInvalidError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'OAUTH_TOKEN_INVALID' } })
  }
}

/*********************************
 *                               *
 *            Migration          *
 *                               *
 *********************************/
export class MigrationReachLimitError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'MIGRATION_REACH_LIMIT' } })
  }
}

/*********************************
 *                               *
 *             Payment           *
 *                               *
 *********************************/
export class PaymentAmountTooSmallError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'PAYMENT_AMOUNT_TOO_SMALL' } })
  }
}

export class PaymentAmountInvalidError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'PAYMENT_AMOUNT_INVALID' } })
  }
}

export class PaymentBalanceInsufficientError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'PAYMENT_BALANCE_INSUFFICIENT' } })
  }
}

export class PaymentReachMaximumLimitError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'PAYMENT_REACH_MAXIMUM_LIMIT' } })
  }
}

export class PaymentPayoutAccountExistsError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'PAYMENT_PAYOUT_ACCOUNT_EXISTS' } })
  }
}

export class PaymentPayoutTransactionExistsError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: { code: 'PAYMENT_PAYOUT_TRANSACTION_EXISTS' },
    })
  }
}

export class PaymentPasswordNotSetError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'PAYMENT_PASSWORD_NOT_SET' } })
  }
}

export class PaymentQueueJobDataError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'PAYMENT_QUEUE_JOB_DATA_ERROR' } })
  }
}

/*********************************
 *                               *
 *            Circle             *
 *                               *
 *********************************/
export class DuplicateCircleError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'DUPLICATE_CIRCLE' } })
  }
}

export class DuplicateCircleSubscriptionError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'DUPLICATE_CIRCLE_SUBSCRIPTION' } })
  }
}

export class CircleCreationReachLimitError extends GraphQLError {
  constructor(message: string) {
    super(message, { extensions: { code: 'CIRCLE_CREATION_REACH_LIMIT' } })
  }
}
