import dotenv from 'dotenv'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { name, version } = require('./package.json')

dotenv.config()

const dirname = path.dirname(fileURLToPath(import.meta.url))

const baseConfig = {
  client: 'postgresql',
  connection: {
    host: process.env.MATTERS_PG_HOST,
    user: process.env.MATTERS_PG_USER,
    password: process.env.MATTERS_PG_PASSWORD,
    database: process.env.MATTERS_PG_DATABASE,
    application_name: `${name}/${version}`,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: path.join(dirname, 'db/migrations'),
  },
  seeds: {
    directory: path.join(dirname, 'db/seeds'),
  },
}

export default {
  local: baseConfig,

  test: {
    ...baseConfig,
    // set pool size to 1 to detect db connection acquiring deadlock
    // explained in https://github.com/Vincit/objection.js/issues/1137#issuecomment-561149456
    pool: { min: 1, max: 1 },
  },

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
