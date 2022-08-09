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

  const matty = await knex('user')
    .select('id')
    .where({ email: 'hi@matters.news', role: 'admin', state: 'active' })
    .first()
  const count = await knex('user').count().first()
  console.log(new Date(), 'got matty?', { matty, count })

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

  const tables = await knex('information_schema.tables').select()
  console.log(new Date(), `currently having ${tables.length} tables:`, tables)
}

async function runShellDBRollup() {
  exec('pwd; ls -la; docker container ls -a', (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`)
      return
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`)
      return
    }
    console.log(`stdout: ${stdout}`)
  })

  return new Promise((fulfilled, rejected) => {
    const sh = spawn('sh', [
      '-xc',
      `docker container exec postgres-db sh -xc 'pwd; ls -la; cd /db; env PSQL="psql -U postgres -d ${database} -w" sh -x bin/refresh-lasts.sh; date'`,
    ])

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
