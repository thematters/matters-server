/**
 * Here are all environment variables that server needs. Please add prefix
 * `MATTERS_` before environment variables.
 */
export const environment = {
  env: process.env['MATTERS_ENV'] || 'development',
  domain: process.env['MATTERS_DOMAIN'],
  awsRegion: process.env['MATTERS_AWS_REGION'],
  pgHost: process.env['MATTERS_PG_HOST'],
  pgUser: process.env['MATTERS_PG_USER'],
  pgPassword: process.env['MATTERS_PG_PASSWORD'],
  pgDatabase: process.env['MATTERS_PG_DATABASE'],
  ipfsAddress: process.env['MATTERS_IPFS_ADDRESS'],
  sendgridKey: process.env['MATTERS_SENDGRID_KEY'],
  emailName: process.env['MATTERS_EMAIL_NAME'],
  jwtSecret: process.env['MATTERS_JWT_SECRET'] || '',
  cloudinaryURL: 'https://res.cloudinary.com/domcnelhc'
}
