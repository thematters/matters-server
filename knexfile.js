module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env['MATTERS_PG_HOST'],
      user: process.env['MATTERS_PG_USER'],
      password: process.env['MATTERS_PG_PASSWORD'],
      database: process.env['MATTERS_PG_DATABASE']
    }
  },

  staging: {
    client: 'postgresql',
    connection: {
      host: process.env['MATTERS_PG_HOST'],
      user: process.env['MATTERS_PG_USER'],
      password: process.env['MATTERS_PG_PASSWORD'],
      database: process.env['MATTERS_PG_DATABASE']
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },

  production: {
    client: 'postgresql',
    connection: {
      host: process.env['MATTERS_PG_HOST'],
      user: process.env['MATTERS_PG_USER'],
      password: process.env['MATTERS_PG_PASSWORD'],
      database: process.env['MATTERS_PG_DATABASE']
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  }
}
