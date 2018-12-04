module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env['MATTERS_PG_HOST'],
      user: process.env['MATTERS_PG_USER'],
      password: process.env['MATTERS_PG_PASSWORD'],
      database: process.env['MATTERS_PG_DATABASE']
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './db/migrations'
    },
    seeds: {
      directory: './db/seeds'
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
      tableName: 'knex_migrations',
      directory: './db/migrations'
    },
    seeds: {
      directory: './db/seeds'
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
      tableName: 'knex_migrations',
      directory: './db/migrations'
    },
    seeds: {
      directory: './db/seeds'
    }
  }
}
