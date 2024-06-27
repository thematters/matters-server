const { spawn } = require('child_process')
const { knexSnakeCaseMappers } = require('objection')

require('dotenv').config()

const debug = process.env.MATTERS_LOGGING_LEVEL === 'debug'

module.exports = async (database) => {
  if (process.env.MATTERS_ENV !== 'test')
    throw new Error("In order to run test cases, MATTERS_ENV must be 'test'.")

  const Knex = require('knex')

  const knexConfig = {
    client: 'postgresql',
    connection: {
      host: process.env.MATTERS_PG_HOST,
      user: process.env.MATTERS_PG_USER,
      password: process.env.MATTERS_PG_PASSWORD,
      database: 'postgres', // set to var database below,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: __dirname + '/migrations',
    },
    seeds: {
      directory: __dirname + '/seeds',
    },
    pool: { min: 1, max: 10 },
  }

  // create target database if not exists
  const knex = Knex(knexConfig)
  await knex.raw('DROP DATABASE IF EXISTS ??', database)
  await knex.raw('CREATE DATABASE ??', database)
  await knex.destroy()

  // migrate and seed target database
  knexConfig.connection.database = database
  const seedKnex = Knex(knexConfig)

  const rollbackAllMigrations = async () => {
    const migration = await seedKnex.migrate.currentVersion()
    if (migration !== 'none') {
      await seedKnex.migrate.rollback()
      await rollbackAllMigrations()
    } else {
      return
    }
  }

  await rollbackAllMigrations()
  await seedKnex.migrate.latest()
  await seedKnex.seed.run()

  // re-run specific migrations after seeding
  const tasks = ['20201103090135_recreate_curation_tag_materialized.js']
  for (const task of tasks) {
    await seedKnex.migrate.down({ name: task })
    await seedKnex.migrate.up({ name: task })
  }

  // connect postgres container to run PSQL scripts
  await runShellDBRollup(knexConfig.connection)

  // grant read-only right to all users
  await seedKnex.raw('GRANT SELECT ON  ALL TABLES IN SCHEMA public TO PUBLIC;')
  // await knex.raw('GRANT SELECT ON  ALL TABLES IN SCHEMA mat_views TO PUBLIC;')
  // await knex.raw('GRANT SELECT ON  ALL TABLES IN SCHEMA search_index TO PUBLIC;')
  //
  await seedKnex.destroy()

  // return a new knex instance with snake_case_mappers
  return Knex({
    ...knexConfig,
    ...knexSnakeCaseMappers(),
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
