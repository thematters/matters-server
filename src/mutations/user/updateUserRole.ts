// import logger from 'common/logger.js'
import { fromGlobalId } from 'common/utils/index.js'
import { MutationToUpdateUserRoleResolver } from 'definitions'

const resolver: MutationToUpdateUserRoleResolver = async (
  _,
  { input: { id, role } },
  { viewer, dataSources: { atomService } }
) => {
  const { id: dbId } = fromGlobalId(id)

  const data = { role }

  const user = await atomService.update({
    table: 'user',
    where: { id: dbId },
    data,
  })

  try {
    await atomService.es.client.update({
      index: 'user',
      id: dbId,
      body: {
        doc: data,
      },
    })
  } catch (err) {
    // logger.error(err)
    console.error(new Date(), 'ERROR:', err)
  }

  return user
}

export default resolver
