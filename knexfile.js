import dotenv from 'dotenv'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { environment } from '#common/environment.js'

const require = createRequire(import.meta.url)
const { name, version } = require('./package.json')

dotenv.config()

const dirname = path.dirname(fileURLToPath(import.meta.url))

const baseConfig = {
  client: 'pg',
  connection: {
    host: environment.pgHost,
    user: environment.pgUser,
    password: environment.pgPassword,
    database: environment.pgDatabase,
    port: environment.pgPort,
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
    acquireConnectionTimeout: 60000 * 2,
  },

  development: baseConfig,

  production: {
    ...baseConfig,
    pool: {
      min: 2,
      max: 10,
    },
  },
}
