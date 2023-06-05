const { name, version } = require('./package.json')

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
    directory: __dirname + '/db/migrations',
  },
  seeds: {
    directory: __dirname + '/db/seeds',
  },
}

module.exports = {
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
