import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const baseConfig = {
  client: 'postgresql',
  connection: {
    host: process.env.MATTERS_PG_HOST,
    user: process.env.MATTERS_PG_USER,
    password: process.env.MATTERS_PG_PASSWORD,
    database: process.env.MATTERS_PG_DATABASE,
    // application_name: ``,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: __dirname + '/db/migrations',
  },
  seeds: {
    directory: __dirname + '/db/seeds',
  },
}

const configs = {
  test: {
    ...baseConfig,
    connection: {
      ...baseConfig.connection,
      database: 'test_' + process.env.MATTERS_PG_DATABASE, // always prefix test db with 'test_'
    },
  },

  local: baseConfig,

  development: baseConfig,

  stage: baseConfig,

  production: {
    ...baseConfig,
    pool: {
      min: 2,
      max: 10,
    },
  },
}

export default configs
