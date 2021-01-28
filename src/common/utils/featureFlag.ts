import { USER_ROLE } from 'common/enums'
import { AtomService } from 'connectors'
import { GQLFeatureFlag, Viewer } from 'definitions'

export const isFeatureEnabled = async (
  flag: GQLFeatureFlag,
  viewer: Viewer,
  service?: AtomService
) => {
  switch (flag) {
    case GQLFeatureFlag.on: {
      return true
    }
    case GQLFeatureFlag.admin: {
      return viewer.role === USER_ROLE.admin
    }
    case GQLFeatureFlag.seeding: {
      if (!('userName' in viewer) || !service) {
        return false
      }

      if (viewer.role === USER_ROLE.admin) {
        return true
      }

      const seedingUser = await service.count({
        table: 'seeding_user',
        where: { userName: viewer.userName },
      })
      return seedingUser > 0
    }
  }
  return false
}
