import { spawn } from 'child_process'
import dotenv from 'dotenv'
import Knex from 'knex'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config()

const debug = process.env.MATTERS_LOGGING_LEVEL === 'debug'

export default async (database) => {
  if (process.env.MATTERS_ENV !== 'test')
    throw new Error("In order to run test cases, MATTERS_ENV must be 'test'.")

  const knexConfig = {
    client: 'postgresql',
    connection: {
      host: process.env.MATTERS_PG_HOST,
      user: process.env.MATTERS_PG_USER,
      password: process.env.MATTERS_PG_PASSWORD,
      port: process.env.MATTERS_PG_PORT || 5432,
      database: 'postgres', // set to database param below,
      application_name: 'initDatabase_' + database,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: dirname + '/migrations',
    },
    seeds: {
      directory: dirname + '/seeds',
    },
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
}

async function runShellDBRollup(connection) {
  const { host, user, password, database, port } = connection
  const cwd = dirname
  const env = {
    PGPASSWORD: password,
    PSQL: `psql -h ${host} -U ${user} -p ${port} -d ${database} -w`,
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
