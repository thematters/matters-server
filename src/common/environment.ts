import dotenv from 'dotenv'
import dotenvExpand from 'dotenv-expand'
import fs from 'fs'
import path from 'path'

dotenvExpand.expand(dotenv.config())

let OICDPrivateKey = ''
if (process.env.MATTERS_OICD_PRIVATE_KEY) {
  const filePath = path.resolve(
    __dirname,
    `../../${process.env.MATTERS_OICD_PRIVATE_KEY}`
  )

  try {
    OICDPrivateKey = fs.readFileSync(filePath, { encoding: 'utf8' })
  } catch (e) {
    console.error(new Date(), `Failed to load OICD private key on ${filePath}`)
  }
}

export const isLocal = process.env.MATTERS_ENV === 'local'
export const isTest = process.env.MATTERS_ENV === 'test'
export const isDev = process.env.MATTERS_ENV === 'development'
export const isStage = process.env.MATTERS_ENV === 'stage'
export const isProd = process.env.MATTERS_ENV === 'production'

/**
 * Here are all environment variables that server needs. Please add prefix
 * `MATTERS_` before environment variables.
 */

export const environment = {
  env: process.env.MATTERS_ENV,
  loggingLevel: process.env.MATTERS_LOGGING_LEVEL || 'info',
  debug: process.env.MATTERS_DEBUG || '',
  serverDomain: process.env.MATTERS_SERVER_DOMAIN || '',
  siteDomain: (process.env.MATTERS_SITE_DOMAIN || 'matters.town') as string,
  oauthSiteDomain: process.env.MATTERS_OAUTH_SITE_DOMAIN as string,
  awsRegion: process.env.MATTERS_AWS_REGION,
  awsAccessId: process.env.MATTERS_AWS_ACCESS_ID,
  awsAccessKey: process.env.MATTERS_AWS_ACCESS_KEY,
  awsS3Endpoint: process.env.MATTERS_AWS_S3_ENDPOINT,
  awsS3Bucket: process.env.MATTERS_AWS_S3_BUCKET || '',
  awsNotificationQueueUrl: process.env.MATTERS_AWS_NOTIFICATION_QUEUE_URL || '',
  awsMailQueueUrl: process.env.MATTERS_AWS_MAIL_QUEUE_URL || '',
  awsExpressMailQueueUrl: process.env.MATTERS_AWS_EXPRESS_MAIL_QUEUE_URL || '',
  awsArchiveUserQueueUrl: process.env.MATTERS_AWS_ARCHIVE_USER_QUEUE_URL || '',
  awsLikecoinLikeUrl: process.env.MATTERS_AWS_LIKECOIN_LIKE_QUEUE_URL || '',
  awsLikecoinSendPVUrl:
    process.env.MATTERS_AWS_LIKECOIN_SEND_PV_QUEUE_URL || '',
  awsLikecoinUpdateCivicLikerCache:
    process.env.MATTERS_AWS_LIKECOIN_UPDATE_CIVIC_LIKER_CACHE_QUEUE_URL || '',
  tsQiServerUrl: process.env.MATTERS_TSQI_SERVER_URL || '',
  awsCloudFrontEndpoint: process.env.MATTERS_AWS_CLOUD_FRONT_ENDPOINT,
  cloudflareAccountId: process.env.MATTERS_CLOUDFLARE_ACCOUNT_ID,
  cloudflareAccountHash: process.env.MATTERS_CLOUDFLARE_ACCOUNT_HASH,
  cloudflareApiToken: process.env.MATTERS_CLOUDFLARE_API_TOKEN,
  cloudflareTurnstileSecretKey:
    process.env.MATTERS_CLOUDFLARE_TURNSTILE_SECRET_KEY,
  pgHost: process.env.MATTERS_PG_HOST,
  pgUser: process.env.MATTERS_PG_USER,
  pgPassword: process.env.MATTERS_PG_PASSWORD,
  pgDatabase: process.env.MATTERS_PG_DATABASE,
  pgReadonlyConnectionString:
    process.env.MATTERS_PG_READONLY_CONNECTION_STRING ||
    'postgresql://no-exist@no-exist/no-exist',
  searchPgConnectionString:
    process.env.MATTERS_SEARCH_PG_CONNECTION_STRING ||
    // fallback to primary DB for test'ing
    // `postgresql://${process.env.MATTERS_PG_HOST}:${process.env.MATTERS_PG_PASSWORD}@${process.env.MATTERS_PG_HOST}/${process.env.MATTERS_PG_DATABASE}`,
    'postgresql://no-exist@no-exist/no-exist',
  searchPgPassword: process.env.MATTERS_SEARCH_PG_PASSWORD,
  searchPgCoefficients: JSON.parse(
    process.env.MATTERS_SEARCH_PG_COEFFICIENTS || '[1,1,1,1]'
  ),
  searchPgArticleCoefficients: JSON.parse(
    process.env.MATTERS_SEARCH_PG_ARTICLE_COEFFICIENTS || '[1,1,1,1]'
  ),
  searchPgUserCoefficients: JSON.parse(
    process.env.MATTERS_SEARCH_PG_USER_COEFFICIENTS || '[1,1,1,1]'
  ),
  searchPgTagCoefficients: JSON.parse(
    process.env.MATTERS_SEARCH_PG_TAG_COEFFICIENTS || '[1,1,1,1]'
  ),

  ipfsHost: process.env.MATTERS_IPFS_HOST || '',
  ipfsPort: process.env.MATTERS_IPFS_PORT || '5001',
  ipfsServers: process.env.MATTERS_IPFS_SERVERS || '',
  queueHost: process.env.MATTERS_QUEUE_HOST as string,
  queuePort: (process.env.MATTERS_QUEUE_PORT || 6379) as number,
  cacheClusterHost: process.env.MATTERS_CACHE_CLUSTER_HOST || '',
  cacheClusterPort: (process.env.MATTERS_CACHE_CLUSTER_PORT || 6379) as number,
  cacheHost: process.env.MATTERS_CACHE_HOST as string,
  cachePort: (process.env.MATTERS_CACHE_PORT || 6379) as number,
  mattyId: process.env.MATTERS_MATTY_ID || '',
  mattyChoiceTagId: process.env.MATTERS_MATTY_CHOICE_TAG_ID || '',
  emailFromAsk: process.env.MATTERS_EMAIL_FROM_ASK,
  jwtSecret: process.env.MATTERS_JWT_SECRET || '_dev_jwt_secret_',
  sentryDsn: process.env.MATTERS_SENTRY_DSN,
  gcpProjectId: process.env.MATTERS_GCP_PROJECT_ID,
  translateCertPath: process.env.MATTERS_TRANSLATE_CREDENTIAL_PATH,
  OICDPrivateKey,
  likecoinOAuthClientName: process.env.MATTERS_LIKECOIN_OAUTH_CLIENT_NAME || '',
  likecoinMigrationApiURL: process.env.MATTERS_LIKECOIN_MIGRATION_API_URL || '',
  likecoinApiURL: process.env.MATTERS_LIKECOIN_API_URL || '',
  likecoinAuthorizationURL: process.env.MATTERS_LIKECOIN_AUTH_URL || '',
  likecoinTokenURL: process.env.MATTERS_LIKECOIN_TOKEN_URL || '',
  likecoinClientId: process.env.MATTERS_LIKECOIN_CLIENT_ID || '',
  likecoinClientSecret: process.env.MATTERS_LIKECOIN_CLIENT_SECRET || '',
  likecoinCallbackURL: process.env.MATTERS_LIKECOIN_CALLBACK_URL || '',
  likecoinPayURL: process.env.MATTERS_LIKECOIN_PAY_URL || '',
  likecoinPayCallbackURL: process.env.MATTERS_LIKECOIN_PAY_CALLBACK_URL || '',
  likecoinPayLikerId: process.env.MATTERS_LIKECOIN_PAY_LIKER_ID || '',
  likecoinPayWebhookSecret:
    process.env.MATTERS_LIKECOIN_PAY_WEBHOOK_SECRET || '',
  stripeSecret: process.env.MATTERS_STRIPE_SECRET || '',
  stripeWebhookSecret: process.env.MATTERS_STRIPE_WEBHOOK_SECRET || '',
  stripeConnectWebhookSecret:
    process.env.MATTERS_STRIPE_CONNECT_WEBHOOK_SECRET || '',
  stripeConnectClientId: process.env.MATTERS_STRIPE_CONNECT_CLIENT_ID || '',
  slackToken: process.env.MATTERS_SLACK_TOKEN || '',
  slackPayoutChannel: process.env.MATTERS_SLACK_PAYOUT_CHANNEL || '',
  slackStripeAlertChannel: process.env.MATTERS_SLACK_STRIPE_ALERT_CHANNEL || '',
  slackStripeQueueChannel: process.env.MATTERS_SLACK_QUEUE_CHANNEL || '',
  openseaAPIBase:
    process.env.MATTERS_OPENSEA_API_BASE ||
    (isProd
      ? 'https://api.opensea.io/api/v1'
      : 'https://rinkeby-api.opensea.io/api/v1'),
  openseaAPIKey: process.env.MATTERS_OPENSEA_API_KEY || undefined,
  logbookClaimerPrivateKey:
    process.env.MATTERS_LOGBOOK_CLAIMER_PRIVATE_KEY || '',
  alchemyApiKey: process.env.MATTERS_ALCHEMY_API_KEY || '',
  exchangeRatesDataAPIKey:
    process.env.MATTERS_EXCHANGE_RATES_DATA_API_KEY || '',
  twitterConsumerKey: process.env.MATTERS_TWITTER_CONSUMER_KEY || '',
  twitterConsumerSecret: process.env.MATTERS_TWITTER_CONSUMER_SECRET || '',
  twitterClientId: process.env.MATTERS_TWITTER_CLIENT_ID || '',
  twitterClientSecret: process.env.MATTERS_TWITTER_CLIENT_SECRET || '',
  twitterRedirectUri: process.env.MATTERS_TWITTER_REDIRECT_URI || '',
  facebookClientId: process.env.MATTERS_FACEBOOK_CLIENT_ID || '',
  facebookClientSecret: process.env.MATTERS_FACEBOOK_CLIENT_SECRET || '',
  facebookRedirectUri: process.env.MATTERS_FACEBOOK_REDIRECT_URI || '',
  googleClientId: process.env.MATTERS_GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.MATTERS_GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.MATTERS_GOOGLE_REDIRECT_URI || '',

  passphrasesApiUrl: process.env.MATTERS_PASSPHRASES_API_URL || '',
  passphrasesSecret: process.env.MATTERS_PASSPHRASES_SECRET || '',

  spamDetectionApiUrl: process.env.MATTERS_SPAM_DETECTION_API_URL || '',

  translationDefault: process.env.MATTERS_TRANSLATION_DEFAULT,
  translationGoogleProjectId: process.env.MATTERS_TRANSLATION_GOOGLE_PROJECT_ID,
  translationGoogleKeyFile: process.env.MATTERS_TRANSLATION_GOOGLE_KEY_FILE,
}

export const contract = {
  Ethereum: isProd
    ? {
        traveloggersAddress: '0x8515ba8ef2cf2f2ba44b26ff20337d7a2bc5e6d8',
      }
    : {
        traveloggersAddress: '0xae89d81ab5c668661200fa9c6ed45fe1707f7097',
      },
  Polygon: isProd
    ? {
        logbookAddress: '0xcdf8D568EC808de5fCBb35849B5bAFB5d444D4c0',
        curationAddress:
          '0x5edebbdae7B5C79a69AaCF7873796bb1Ec664DB8'.toLowerCase(),
        curationBlockNum: '34564355',
        tokenAddress:
          '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'.toLowerCase(),
        tokenDecimals: 6,
      }
    : {
        logbookAddress: '0x203197e074b7a2f4ff6890815e4657a9c47c68b1',
        curationAddress:
          '0xa219C6722008aa22828B31A13ab9Ba93bB91222c'.toLowerCase(),
        curationBlockNum: '28675517',
        tokenAddress:
          '0xfe4F5145f6e09952a5ba9e956ED0C25e3Fa4c7F1'.toLowerCase(),
        tokenDecimals: 6,
      },
  Optimism: isProd
    ? {
        curationAddress:
          '0x5edebbdae7B5C79a69AaCF7873796bb1Ec664DB8'.toLowerCase(),
        curationBlockNum: '117058632',
        tokenAddress:
          '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'.toLowerCase(),
        tokenDecimals: 6,
      }
    : {
        curationAddress:
          '0x92a117aeA74963Cd0CEdF9C50f99435451a291F7'.toLowerCase(),
        curationBlockNum: '8438904',
        tokenAddress:
          '0x5fd84259d66Cd46123540766Be93DFE6D43130D7'.toLowerCase(),
        tokenDecimals: 6,
      },
}
