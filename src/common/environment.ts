export const environment = {
  env: process.env['MATTERS_ENV'],
  region: process.env['MATTERS_AWS_REGION'],
  accessId: process.env['MATTERS_AWS_ACCESS_ID'],
  accessKey: process.env['MATTERS_AWS_ACCESS_KEY'],
  sendgridKey: process.env['MATTERS_SENDGRID_KEY'],
  emailName: process.env['MATTERS_EMAIL_NAME']
}
