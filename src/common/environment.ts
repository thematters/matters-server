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
  elasticSearchEndpoint: process.env['MATTERS_ELASTICSEARCH_ENDPOINT'],
  awsCloudFrontEndpoint: process.env['MATTERS_AWS_CLOUD_FRONT_ENDPOINT'],
  pgHost: process.env['MATTERS_PG_HOST'],
  pgUser: process.env['MATTERS_PG_USER'],
  pgPassword: process.env['MATTERS_PG_PASSWORD'],
  pgDatabase: process.env['MATTERS_PG_DATABASE'],
  ipfsAddress: process.env['MATTERS_IPFS_ADDRESS'],
  sendgridKey: process.env['MATTERS_SENDGRID_KEY'],
  emailName: process.env['MATTERS_EMAIL_NAME'],
  jwtSecret: process.env['MATTERS_JWT_SECRET'] || '_dev_jwt_secret_',
  cloudinaryURL: 'https://res.cloudinary.com/domcnelhc'
}
