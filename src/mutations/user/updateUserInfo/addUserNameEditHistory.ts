import logger from 'common/logger'
import { knex } from 'connectors'

/**
 * Add user name edit history
 */
export default async ({
  userId,
  previous,
}: {
  userId: string
  previous: string
}) => {
  const table = 'username_edit_history'
  const [result] = await knex(table).insert({ userId, previous }).returning('*')
  logger.info(`Inserted id ${result.id} to ${table}`)
  return result
}
