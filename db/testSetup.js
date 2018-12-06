// set the global environment to 'test'
process.env['MATTERS_ENV'] = 'test'

const { Client } = require('pg')
const Knex = require('knex')
const knexConfig = require('../knexfile')
const knex = Knex(knexConfig[process.env['MATTERS_ENV']])
const database = knexConfig[process.env['MATTERS_ENV']].connection.database

global.knex = knex

module.exports = async () => {
  const rollbackAllMigrations = async () => {
    const migration = await knex.migrate.currentVersion()
    if (migration !== 'none') {
      await knex.migrate.rollback()
      await rollbackAllMigrations()
    } else {
      return
    }
  }

  const client = new Client({
    host: process.env['MATTERS_PG_HOST'],
    user: process.env['MATTERS_PG_USER'],
    password: process.env['MATTERS_PG_PASSWORD'],
    database: 'postgres',
  })

  // create test db if it does not exist
  client.connect()
  const result = await client.query('SELECT * FROM pg_catalog.pg_database WHERE datname = \'' + database + '\'')
  if (!result.rowCount) {
    await client.query('CREATE DATABASE "' + database + '"')
  }
  client.end()

  await rollbackAllMigrations()
  await knex.migrate.latest()
  await knex.seed.run()
}
