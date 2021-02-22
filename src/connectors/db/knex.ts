import Knex from 'knex'
import { knexSnakeCaseMappers } from 'objection'

import { environment } from 'common/environment'
import { MaterializedView, TableName } from 'definitions'

// @ts-ignore
import knexConfig from '../../../knexfile'

export const knex = Knex({
  ...knexConfig[environment.env],
  ...knexSnakeCaseMappers(),
})

export const refreshView = async (view: MaterializedView) =>
  knex.raw(/*sql*/ `
    create unique index if not exists ${view}_id on public.${view} (id);
    refresh materialized view concurrently ${view}
  `)
