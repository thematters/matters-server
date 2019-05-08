import _ from 'lodash'

export * from './makeContext'
export * from './globalId'
export * from './initSubscriptions'
export * from './connections'
export * from './validator'
export * from './notice'
export * from './getViewer'
export * from './i18n'
export * from './cookie'
export * from './removeEmpty'
export * from './xss'
export * from './makeStreamToBuffer'
export * from './content'

/**
 * Make a valid user name based on a given email address. It removes all special characters including _.
 * Also, leave 3 charateres for appending postfix when it's a duplicated user name.
 */
export const makeUserName = (email: string): string => {
  const matched = email.split('@')[0].match(/[a-zA-Z0-9_]*/g)

  if (!matched) {
    return ''
  }

  return matched.join('').substring(0, 18)
}
