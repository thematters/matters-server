import dotenv from 'dotenv'
dotenv.config()

let firebaseCert = {}

if (process.env.MATTERS_FIREBASE_CREDENTIALS) {
  firebaseCert = require(`../../${process.env.MATTERS_FIREBASE_CREDENTIALS}`)
}

/**
 * Here are all environment variables that server needs. Please add prefix
 * `MATTERS_` before environment variables.
 */

export const environment = {
  env: process.env.MATTERS_ENV || 'development',
  domain: process.env.MATTERS_DOMAIN,
  siteDomain: process.env.MATTERS_SITE_DOMAIN as string,
  awsRegion: process.env.MATTERS_AWS_REGION,
  awsAccessId: process.env.MATTERS_AWS_ACCESS_ID,
  awsAccessKey: process.env.MATTERS_AWS_ACCESS_KEY,
  awsS3Endpoint: process.env.MATTERS_AWS_S3_ENDPOINT,
  awsS3Bucket: process.env.MATTERS_AWS_S3_BUCKET,
  esHost: process.env.MATTERS_ELASTICSEARCH_HOST,
  esPort: process.env.MATTERS_ELASTICSEARCH_PORT,
  awsCloudFrontEndpoint: process.env.MATTERS_AWS_CLOUD_FRONT_ENDPOINT,
  pgHost: process.env.MATTERS_PG_HOST,
  pgUser: process.env.MATTERS_PG_USER,
  pgPassword: process.env.MATTERS_PG_PASSWORD,
  pgDatabase: process.env.MATTERS_PG_DATABASE,
  ipfsHost: process.env.MATTERS_IPFS_HOST,
  ipfsPort: process.env.MATTERS_IPFS_PORT || '5001',
  pubSubHost: process.env.MATTERS_PUBSUB_HOST as string,
  pubSubPort: (process.env.MATTERS_PUBSUB_PORT || 6379) as number,
  queueHost: process.env.MATTERS_QUEUE_HOST as string,
  queuePort: (process.env.MATTERS_QUEUE_PORT || 6379) as number,
  cacheHost: process.env.MATTERS_CACHE_HOST as string,
  cachePort: (process.env.MATTERS_CACHE_PORT || 6379) as number,
  sgKey: process.env.MATTERS_SENDGRID_API_KEY,
  jpushKey: process.env.MATTERS_JPUSH_API_KEY,
  jpushSecret: process.env.MATTERS_JPUSH_API_SECRET,
  emailFromAsk: process.env.MATTERS_EMAIL_FROM_ASK,
  jwtSecret: process.env.MATTERS_JWT_SECRET || '_dev_jwt_secret_',
  apiKey: process.env.MATTERS_APOLLO_API_KEY,
  sentryDsn: process.env.MATTERS_SENTRY_DSN,
  firebaseCert,
  likecoinOAuthClientName: process.env.MATTERS_LIKECOIN_OAUTH_CLIENT_NAME || '',
  likecoinMigrationApiURL: process.env.MATTERS_LIKECOIN_MIGRATION_API_URL || '',
  likecoinApiURL: process.env.MATTERS_LIKECOIN_API_URL || '',
  likecoinAuthorizationURL: process.env.MATTERS_LIKECOIN_AUTH_URL || '',
  likecoinTokenURL: process.env.MATTERS_LIKECOIN_TOKEN_URL || '',
  likecoinClientId: process.env.MATTERS_LIKECOIN_CLIENT_ID || '',
  likecoinClientSecret: process.env.MATTERS_LIKECOIN_CLIENT_SECRET || '',
  likecoinCallbackURL: process.env.MATTERS_LIKECOIN_CALLBACK_URL || ''
}

export const isDev = environment.env.includes('dev')
export const isTest = environment.env.includes('test')
export const isProd = environment.env.includes('prod')
