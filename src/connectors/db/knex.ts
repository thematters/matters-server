import { knex as knexInstantiator } from 'knex'
import { knexSnakeCaseMappers } from 'objection'

import { environment, isTest } from 'common/environment'
import { MaterializedView } from 'definitions'

// @ts-ignore
import knexConfig from '../../../knexfile'

export const knex = knexInstantiator({
  ...knexConfig[environment.env],
  ...knexSnakeCaseMappers(),
})

export const readonlyKnex = knexInstantiator({
  ...knexConfig[environment.env],
  ...knexSnakeCaseMappers(),
  ...(isTest
    ? {
        pool: {
          afterCreate(conn: any, done: any) {
            conn.query(
              'SET default_transaction_read_only = on;',
              (err: any) => {
                if (err) {
                  done(err, conn)
                }
              }
            )
          },
        },
      }
    : { connection: environment.pgReadonlyConnectionString }),
})

export const searchKnexDB = knexInstantiator({
  ...knexConfig[environment.env],
  ...knexSnakeCaseMappers(),
  ...(isTest
    ? {} // knexConfig[environment.env].connection
    : { connection: environment.searchPgConnectionString }),
})

export const refreshView = async (view: MaterializedView) =>
  knex.raw(/*sql*/ `
    create unique index if not exists ${view}_id on public.${view} (id);
    refresh materialized view concurrently ${view}
  `)
