// import { isNil, omitBy } from 'lodash'

import { UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { GQLMutationResolvers } from 'definitions'

const resolver: GQLMutationResolvers['toggleUsersBadge'] = async (
  _,
  { input: { ids, type, enabled } },
  { dataSources: { atomService } }
) => {
  if (!ids || ids.length === 0) {
    throw new UserInputError('"ids" is required')
  }
  if (typeof enabled !== 'boolean') {
    throw new UserInputError('"enabled" is required')
  }

  const table = 'user_badge'
  const userIds = ids.map((id) => fromGlobalId(id).id) // .filter(Boolean)

  let level = 0
  switch (type) {
    case 'nomad1':
      level = 1
      break
    case 'nomad2':
      level = 2
      break
    case 'nomad3':
      level = 3
      break
    case 'nomad4':
      level = 4
      break
    // level = Number.parseInt(type.charAt(5)) // only 1, 2, 3, 4
    // type = 'nomad'
  }
  const dbType = (
    type.startsWith('nomad') && level >= 1 ? 'nomad' : type
  ) as string

  await // enabled
  Promise.all(
    userIds.map((id) => {
      const dataUpdate =
        // omitBy(
        { enabled, ...(level ? { extra: { level } } : null) }
      const dataCreate = { userId: id, type: dbType, ...dataUpdate }

      return atomService.upsert({
        table,
        where: { userId: id, type: dbType },
        update: dataUpdate,
        create: dataCreate,
      })
    })
  )

  // notifications TODO for Nomad Campaign

  return atomService.findMany({ table: 'user', whereIn: ['id', userIds] })
}

export default resolver
