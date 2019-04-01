/**
 * Here are all environment variables that server needs. Please add prefix
 * `MATTERS_` before environment variables.
 */
export const environment = {
  env: process.env['MATTERS_ENV'] || 'development',
  domain: process.env['MATTERS_DOMAIN'],
  awsRegion: process.env['MATTERS_AWS_REGION'],
  awsAccessId: process.env['MATTERS_AWS_ACCESS_ID'],
  awsAccessKey: process.env['MATTERS_AWS_ACCESS_KEY'],
  awsS3Endpoint: process.env['MATTERS_AWS_S3_ENDPOINT'],
  awsS3Bucket: process.env['MATTERS_AWS_S3_BUCKET'],
  esHost: process.env['MATTERS_ELASTICSEARCH_HOST'],
  esPort: process.env['MATTERS_ELASTICSEARCH_PORT'],
  awsCloudFrontEndpoint: process.env['MATTERS_AWS_CLOUD_FRONT_ENDPOINT'],
  pgHost: process.env['MATTERS_PG_HOST'],
  pgUser: process.env['MATTERS_PG_USER'],
  pgPassword: process.env['MATTERS_PG_PASSWORD'],
  pgDatabase: process.env['MATTERS_PG_DATABASE'],
  ipfsHost: process.env['MATTERS_IPFS_HOST'],
  ipfsPort: process.env['MATTERS_IPFS_PORT'] || '5001',
  pubSubHost: process.env['MATTERS_PUBSUB_HOST'],
  pubSubPort: process.env['MATTERS_PUBSUB_PORT'] || 6379,
  queueHost: process.env['MATTERS_QUEUE_HOST'],
  queuePort: process.env['MATTERS_QUEUE_PORT'] || 6379,
  cacheHost: process.env['MATTERS_CACHE_HOST'],
  cachePort: process.env['MATTERS_CACHE_PORT'] || 6379,
  sgKey: process.env['MATTERS_SENDGRID_API_KEY'],
  jpushKey: process.env['MATTERS_JPUSH_API_KEY'],
  jpushSecret: process.env['MATTERS_JPUSH_API_SECRET'],
  emailFromAsk: process.env['MATTERS_EMAIL_FROM_ASK'],
  jwtSecret: process.env['MATTERS_JWT_SECRET'] || '_dev_jwt_secret_',
  apiKey: process.env['MATTERS_APOLLO_API_KEY']
}

export const isDev = environment.env.includes('dev')
export const isTest = environment.env.includes('test')
export const isProd = environment.env.includes('prod')
