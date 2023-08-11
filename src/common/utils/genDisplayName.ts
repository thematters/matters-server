import type { User } from 'definitions'

import { isValidDisplayName } from './validator'

export const genDisplayName = (user: User): string | undefined => {
  const { displayName: orignalName, email, userName } = user
  if (orignalName) {
    return orignalName
  }
  if (email) {
    const displayName = email.split('@')[0]
    if (displayName.length <= 20 && isValidDisplayName(displayName)) {
      return displayName
    }
  }
  // TBD: get displayName from user social accounts
  if (userName) {
    return userName || undefined
  }
}
