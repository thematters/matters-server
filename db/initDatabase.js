const { exec, spawn, spawnSync } = require('child_process')
const { knexSnakeCaseMappers } = require('objection')

require('dotenv').config()

const debug = process.env.MATTERS_LOGGING_LEVEL === 'debug'

module.exports = async (database) => {
  if (process.env.MATTERS_ENV !== 'test')
    throw new Error("In order to run test cases, MATTERS_ENV must be 'test'.")

  const { Client } = require('pg')
  const Knex = require('knex')

  const connection = {
    host: process.env.MATTERS_PG_HOST,
    user: process.env.MATTERS_PG_USER,
    password: process.env.MATTERS_PG_PASSWORD,
    database,
  }

  const knexConfig = {
    client: 'postgresql',
    connection,
    migrations: {
      tableName: 'knex_migrations',
      directory: __dirname + '/migrations',
    },
    seeds: {
      directory: __dirname + '/seeds',
    },
  }
  const knex = Knex(knexConfig)

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
    ...connection,
    database: 'postgres',
  })

  // create new test db everytime
  client.connect()
  await client.query('DROP DATABASE IF EXISTS "' + database + '"')
  await client.query('CREATE DATABASE "' + database + '"')
  if (debug) console.log(`created database "${database}"`)
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
  await runShellDBRollup(connection)

  // grant read-only right to all users
  await knex.raw('GRANT SELECT ON  ALL TABLES IN SCHEMA public TO PUBLIC;')
  // await knex.raw('GRANT SELECT ON  ALL TABLES IN SCHEMA mat_views TO PUBLIC;')
  // await knex.raw('GRANT SELECT ON  ALL TABLES IN SCHEMA search_index TO PUBLIC;')
  //
  await knex.destroy()

  // return a new knex instance with snake_case_mappers
  return Knex({
    ...knexConfig,
    ...knexSnakeCaseMappers(),
    pool: { min: 1, max: 6 },
    // debug: true
  })
}

async function runShellDBRollup(connection) {
  const { host, user, password, database } = connection
  const cwd = __dirname
  const env = {
    PGPASSWORD: password,
    PSQL: `psql -h ${host} -U ${user} -d ${database} -w`,
  }
  const cmd = `sh -x bin/refresh-lasts.sh; date`

  return new Promise((fulfilled, rejected) => {
    const sh = spawn('sh', ['-xc', cmd], { cwd, env })

    sh.stdout.on('data', (data) => {
      if (debug) console.log(`stdout: ${data}`)
    })

    sh.stderr.on('data', (data) => {
      if (debug) console.log(`stderr: ${data}`)
    })

    sh.on('error', (error) => {
      console.log(`error: ${error.message}`)
      rejected(error)
    })

    sh.on('close', (code) => {
      if (debug) console.log(`child process exited with code ${code}`)
      fulfilled()
    })
  })
}
