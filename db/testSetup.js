const { exec, spawn, spawnSync } = require('child_process')

require('dotenv').config()

// MATTERS_ENV must be 'test' in order to run test cases
if (process.env['MATTERS_ENV'] !== 'test')
  throw new Error("In order to run test cases, MATTERS_ENV must be 'test'.")

const { Client } = require('pg')
const Knex = require('knex')
const knexConfig = require('../knexfile')
const knex = Knex(knexConfig.test)
const database = knexConfig.test.connection.database
const host = process.env['MATTERS_PG_HOST']
const user = process.env['MATTERS_PG_USER']
const password = process.env['MATTERS_PG_PASSWORD']

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
    host,
    user,
    password,
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

  // re-run specific migrations after seeding
  const tasks = [
    // '20200904104135_create_curation_tag_materialized.js',
    '20201103090135_recreate_curation_tag_materialized.js',
  ]
  for (const task of tasks) {
    await knex.migrate.down({ name: task })
    await knex.migrate.up({ name: task })
  }

  // connect postgres container to run PSQL scripts
  await runShellDBRollup()

  // grant read-only right to all users
  await knex.raw('GRANT SELECT ON  ALL TABLES IN SCHEMA public TO PUBLIC;')
  // await knex.raw('GRANT SELECT ON  ALL TABLES IN SCHEMA mat_views TO PUBLIC;')
  // await knex.raw('GRANT SELECT ON  ALL TABLES IN SCHEMA search_index TO PUBLIC;')
}

async function runShellDBRollup() {
  const dbPath = __dirname // '{project-root}/db'
  const cmd = `cd ${dbPath}; env PGPASSWORD=${password} PSQL="psql -h ${host} -U ${user} -d ${database} -w" sh -x bin/refresh-lasts.sh; date`

  return new Promise((fulfilled, rejected) => {
    const sh = spawn('sh', ['-xc', cmd])

    sh.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`)
    })

    sh.stderr.on('data', (data) => {
      console.log(`stderr: ${data}`)
    })

    sh.on('error', (error) => {
      console.log(`error: ${error.message}`)
      rejected(error)
    })

    sh.on('close', (code) => {
      console.log(`child process exited with code ${code}`)
      fulfilled()
    })
  })
}
