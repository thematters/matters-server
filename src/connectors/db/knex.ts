import knexLib from 'knex'
import { knexSnakeCaseMappers } from 'objection'

import { environment, isTest } from 'common/environment.js'
import { MaterializedView } from 'definitions'

import knexConfig from './config.js'

export const knex = knexLib({
  // @ts-ignore
  ...knexConfig[environment.env],
  ...knexSnakeCaseMappers(),
})

export const readonlyKnex = knexLib({
  // @ts-ignore
  ...knexConfig[environment.env],
  ...knexSnakeCaseMappers(),
  ...(isTest ? {} : { connection: environment.pgReadonlyConnectionString }),
})

if (isTest) {
  readonlyKnex.client.pool.on('createSuccess', (_: any, resource: any) => {
    resource.run('SET default_transaction_read_only = on', () => {
      /* Here can be empty */
    })
  })
}

export const searchKnexDB = knexLib({
  // @ts-ignore
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
