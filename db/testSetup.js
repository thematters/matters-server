require('dotenv').config()

// MATTERS_ENV must be 'test' in order to run test cases
if (process.env['MATTERS_ENV'] !== 'test')
  throw new Error("In order to run test cases, MATTERS_ENV must be 'test'.")

const { Client } = require('pg')
const Knex = require('knex')
const knexConfig = require('../knexfile')
const knex = Knex(knexConfig.test)
const database = knexConfig.test.connection.database

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

  // create new test db everytime
  client.connect()
  await client.query('DROP DATABASE IF EXISTS "' + database + '"')
  await client.query('CREATE DATABASE "' + database + '"')
  client.end()

  await rollbackAllMigrations()
  await knex.migrate.latest()
  await knex.seed.run()
}
