import { isNil, omitBy } from 'lodash'

import logger from 'common/logger'
import { es, knex } from 'connectors'
import { GQLUpdateUserInfoInput, UserRole } from 'definitions'

/**
 * Update user db & es record
 * @param id: user id
 * @param data: data to be updated
 */
export const updateUserInfo = async (
  id: string,
  data: GQLUpdateUserInfoInput & {
    email?: string
    emailVerified?: boolean
    state?: string
    role?: UserRole
  }
) => {
  const table = 'user'

  const [user] = await knex
    .where('id', id)
    .update({ updatedAt: new Date(), ...data })
    .into(table)
    .returning('*')

  logger.info(`Updated id ${id} in ${table}`)

  // remove null and undefined, and write into search
  const { description, displayName, userName, state, role } = data

  if (!(description || displayName || userName || state || role)) {
    return user
  }

  const searchable = omitBy(
    { description, displayName, userName, state },
    isNil
  )

  try {
    await es.client.update({
      index: table,
      id,
      body: {
        doc: searchable,
      },
    })
  } catch (e) {
    logger.error(e)
  }

  return user
}
