import initDatabase from './initDatabase.js'

process.env.MATTERS_CLOUDFLARE_ACCOUNT_HASH = 'kDRCwexxxx-pYA'

export default async function () {
  const database = process.env.MATTERS_PG_DATABASE
  const setup = process.env.MATTERS_TEST_DB_SETUP
  // setup database for lambda-handlers repo
  if (setup) {
    await initDatabase(database)
  }
}
