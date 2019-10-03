import isPlainObject from 'lodash/isPlainObject'
import { isEmail } from 'validator'

import { INVALID_NAMES } from 'common/enums'

/**
 * Validate email address.
 */
export const isValidEmail = isEmail

/**
 * Validate user name. It only accepts alphabets, numbers and _.
 *
 * @see https://mattersnews.slack.com/archives/G8877EQMS/p1546446430005500
 */

export const isValidUserName = (name: string): boolean => {
  if (
    !name ||
    (name.length < 4 || name.length > 15) ||
    INVALID_NAMES.includes(name.toLowerCase())
  ) {
    return false
  }
  return /^[a-zA-Z0-9_]*$/.test(name)
}

/**
 * Validate user display name. It only accepts alphabets, chinese characters and numbers.
 *
 * @see https://mattersnews.slack.com/archives/G8877EQMS/p1546446430005500
 */
export const isValidDisplayName = (name: string): boolean => {
  if (
    !name ||
    (name.length < 2 || name.length > 20) ||
    INVALID_NAMES.includes(name.toLowerCase())
  ) {
    return false
  }
  return /^[A-Za-z0-9\u4E00-\u9FFF\u3400-\u4DFF\uF900-\uFAFF\u2e80-\u33ffh]*$/.test(
    name
  )
}

/**
 * Validate user raw pass word. It only accepts any ASCII character.
 */
export const isValidPassword = (password: string): boolean => {
  if (!password || password.length < 8) {
    return false
  }
  return /^[\x00-\x7F]*$/.test(password)
}

/**
 * Validate if string is in english.
 */
export const isEnglish = (str: string): boolean => {
  if (!str) {
    return false
  }
  return /^[a-zA-Z0-9]*$/.test(str)
}

/**
 * Validate if a plain object is empty or not.
 */
export const isNotEmptyObject = (source: any): boolean =>
  isPlainObject(source) && Object.keys(source).length > 0
