import Knex from 'knex'
import { knexSnakeCaseMappers } from 'objection'

import { environment } from 'common/environment'
import { MaterializedView } from 'definitions'

// @ts-ignore
import knexConfig from '../../../knexfile'

const { env } = environment

export const knex = Knex({ ...knexConfig[env], ...knexSnakeCaseMappers() })

export const refreshView = async (view: MaterializedView) =>
  knex.raw(/*sql*/ `
    create unique index if not exists ${view}_id on public.${view} (id);
    refresh materialized view concurrently ${view}
  `)
