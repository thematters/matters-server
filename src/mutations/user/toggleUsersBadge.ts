import type { GQLMutationResolvers } from '#definitions/index.js'

import { OFFICIAL_NOTICE_EXTEND_TYPE } from '#common/enums/index.js'
import { UserInputError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'
import _uniq from 'lodash/uniq.js'

const resolver: GQLMutationResolvers['toggleUsersBadge'] = async (
  _,
  { input: { ids, type, enabled } },
  { dataSources: { atomService, notificationService } }
) => {
  if (ids.length === 0) {
    throw new UserInputError('"ids" is required')
  }

  const table = 'user_badge'
  const userIds = _uniq(ids.map((id) => fromGlobalId(id).id))

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
  }
  const dbType = (
    type.startsWith('nomad') && level >= 1 ? 'nomad' : type
  ) as string

  await // enabled
  Promise.all(
    userIds.map((id) => {
      const dataUpdate = { enabled, ...(level ? { extra: { level } } : null) }
      const dataCreate = { userId: id, type: dbType, ...dataUpdate }

      return atomService.upsert({
        table,
        where: { userId: id, type: dbType },
        update: dataUpdate,
        create: dataCreate,
      })
    })
  )
  if (enabled && type === 'grand_slam') {
    for (const userId of userIds) {
      notificationService.trigger({
        event: OFFICIAL_NOTICE_EXTEND_TYPE.badge_grand_slam_awarded,
        recipientId: userId,
      })
    }
  }

  return atomService.findMany({ table: 'user', whereIn: ['id', userIds] })
}

export default resolver
