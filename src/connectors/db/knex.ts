// external
import Knex from 'knex'
import { knexSnakeCaseMappers } from 'objection'
// internal
const knexConfig = require('../../../knexfile')
// loccal
import { environment } from 'common/environment'
import { MaterializedView } from 'definitions'

const { env } = environment

export const knex = Knex({ ...knexConfig[env], ...knexSnakeCaseMappers() })

export const refreshView = async (view: MaterializedView) =>
  knex.raw(/*sql*/ `
    create unique index if not exists ${view}_id on public.${view} (id);
    refresh materialized view concurrently ${view}
  `)
