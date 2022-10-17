import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

import { IMG_CACHE_PATH } from 'common/enums'

dotenv.config()

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
  domain: process.env.MATTERS_DOMAIN || '',
  siteDomain: (process.env.MATTERS_SITE_DOMAIN ||
    'https://matters.news') as string,
  oauthSiteDomain: process.env.MATTERS_OAUTH_SITE_DOMAIN as string,
  awsRegion: process.env.MATTERS_AWS_REGION,
  awsAccessId: process.env.MATTERS_AWS_ACCESS_ID,
  awsAccessKey: process.env.MATTERS_AWS_ACCESS_KEY,
  awsS3Endpoint: process.env.MATTERS_AWS_S3_ENDPOINT,
  awsS3Bucket: process.env.MATTERS_AWS_S3_BUCKET || '',
  esHost: process.env.MATTERS_ELASTICSEARCH_HOST,
  esPort: process.env.MATTERS_ELASTICSEARCH_PORT,
  awsCloudFrontEndpoint: process.env.MATTERS_AWS_CLOUD_FRONT_ENDPOINT,
  pgHost: process.env.MATTERS_PG_HOST,
  pgUser: process.env.MATTERS_PG_USER,
  pgPassword: process.env.MATTERS_PG_PASSWORD,
  pgDatabase: process.env.MATTERS_PG_DATABASE,
  ipfsHost: process.env.MATTERS_IPFS_HOST || '',
  ipfsPort: process.env.MATTERS_IPFS_PORT || '5001',
  queueHost: process.env.MATTERS_QUEUE_HOST as string,
  queuePort: (process.env.MATTERS_QUEUE_PORT || 6379) as number,
  cacheHost: process.env.MATTERS_CACHE_HOST as string,
  cachePort: (process.env.MATTERS_CACHE_PORT || 6379) as number,
  sgKey: process.env.MATTERS_SENDGRID_API_KEY,
  mattyId: process.env.MATTERS_MATTY_ID || '',
  mattyChoiceTagId: process.env.MATTERS_MATTY_CHOICE_TAG_ID || '',
  emailFromAsk: process.env.MATTERS_EMAIL_FROM_ASK,
  jwtSecret: process.env.MATTERS_JWT_SECRET || '_dev_jwt_secret_',
  sentryDsn: process.env.MATTERS_SENTRY_DSN,
  gcpProjectId: process.env.MATTERS_GCP_PROJECT_ID,
  translateCertPath: process.env.MATTERS_TRANSLATE_CREDENTIAL_PATH,
  recaptchaSecret: process.env.MATTERS_RECAPTCHA_KEY,
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
  openExchangeRatesAppId: process.env.MATTERS_OPEN_EXCHANGE_RATES_APP_ID || '',
  openseaAPIBase:
    process.env.MATTERS_OPENSEA_API_BASE ||
    (isProd
      ? 'https://api.opensea.io/api/v1'
      : 'https://rinkeby-api.opensea.io/api/v1'),
  openseaAPIKey: process.env.MATTERS_OPENSEA_API_KEY || undefined,
  traveloggersContractAddress: process.env.MATTERS_LOGRS_CONTRACT_ADDRESS || '',
  logbookContractAddress: process.env.MATTERS_LOGBOOK_CONTRACT_ADDRESS || '',
  logbookClaimerPrivateKey:
    process.env.MATTERS_LOGBOOK_CLAIMER_PRIVATE_KEY || '',
  alchemyApiKey: process.env.MATTERS_ALCHEMY_API_KEY || '',
  curationContractAddress:
    process.env.MATTERS_CURATION_CONTRACT_ADDRESS ||
    (isProd ? '' : '0x94166663d4F8e985f164d335269CD64E4c8620cA'),
}

export const USDTContractAddress = isProd
  ? ''
  : '0xfe4F5145f6e09952a5ba9e956ED0C25e3Fa4c7F1'

const protocolScheme = isLocal ? 'http://' : 'https://'
export const imgCacheServicePrefix = `${protocolScheme}${environment.domain}${
  IMG_CACHE_PATH || '/img-cache'
}`
