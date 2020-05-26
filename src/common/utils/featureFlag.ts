import { USER_ROLE } from 'common/enums'
import { GQLFeatureFlag, Viewer } from 'definitions'

export const isFeatureEnabled = (flag: GQLFeatureFlag, viewer: Viewer) => {
  if (flag === 'on' || (flag === 'admin' && viewer.role === USER_ROLE.admin)) {
    return true
  }

  return false
}
