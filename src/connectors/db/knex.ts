import Knex from 'knex'
import { knexSnakeCaseMappers } from 'objection'

const knexConfig = require('../../../knexfile')

import { environment } from 'common/environment'
import { MaterializedView } from 'definitions'

const { env } = environment

export const knex = Knex({ ...knexConfig[env], ...knexSnakeCaseMappers() })

export const refreshView = async (view: MaterializedView) =>
  knex.raw(/*sql*/ `
    create unique index if not exists ${view}_id on public.${view} (id);
    refresh materialized view concurrently ${view}
  `)
