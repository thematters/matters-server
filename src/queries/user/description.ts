import type { GQLUserInfoResolvers } from '#definitions/index.js'

import { USER_STATE } from '#common/enums/index.js'

// profile bios of restricted accounts should not be readable publicly,
// mirroring the inactive states handled by the web client
const RESTRICTED_USER_STATES = [
  USER_STATE.archived,
  USER_STATE.banned,
  USER_STATE.frozen,
] as const

const resolver: GQLUserInfoResolvers['description'] = (
  { id, state, description },
  _,
  { viewer }
) => {
  const isRestricted = RESTRICTED_USER_STATES.includes(
    state as (typeof RESTRICTED_USER_STATES)[number]
  )

  if (isRestricted && viewer.id !== id && !viewer.hasRole('admin')) {
    return null
  }

  return description
}

export default resolver
