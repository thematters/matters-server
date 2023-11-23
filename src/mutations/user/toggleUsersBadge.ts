import { isNil, omitBy } from 'lodash'

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
  const dbType: string = type.startsWith('nomad') && level >= 1 ? 'nomad' : type

  await // enabled
  Promise.all(
    userIds.map((id) => {
      const dataUpdate = omitBy(
        { type: dbType, extra: level ? { level } : null, enabled },
        isNil
      )
      const dataCreate = { userId: id, ...dataUpdate }

      return atomService.upsert({
        table,
        where: { userId: id },
        update: dataUpdate,
        create: dataCreate,
      })
    })
  )

  // notifications TODO for Nomad Campaign

  return atomService.findMany({ table: 'user', whereIn: ['id', userIds] })
}

export default resolver
