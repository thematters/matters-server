import type { MaterializedView } from 'definitions'
import type { Knex } from 'knex'

export const refreshView = async (view: MaterializedView, knex: Knex) =>
  knex.raw(/* sql*/ `
    create unique index if not exists ${view}_id on public.${view} (id);
    refresh materialized view concurrently ${view}
  `)
