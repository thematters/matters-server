import type { GQLUserStatusResolvers } from 'definitions'

import { CHANGE_EMAIL_TIMES_LIMIT_PER_DAY } from 'common/enums'

const resolver: GQLUserStatusResolvers['changeEmailTimesLeft'] = async (
  { id },
  _,
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    return 0
  }
  return (
    CHANGE_EMAIL_TIMES_LIMIT_PER_DAY - (await userService.changeEmailTimes(id))
  )
}

export default resolver
