// external
import Knex from 'knex'
import { knexSnakeCaseMappers } from 'objection'
// internal
const knexConfig = require('../../../knexfile')
// loccal
import { environment } from 'common/environment'

const { env } = environment
export const knex = Knex({ ...knexConfig[env], ...knexSnakeCaseMappers() })
