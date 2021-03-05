import isEmail from 'validator/lib/isEmail'

import { RESERVED_NAMES } from 'common/enums'

/**
 * Validate email address.
 */
export interface ValidEmailOptions {
  allowPlusSign: boolean
}

const EMAIL_DOMAIN_WHITELIST = ['matters.news', 'like.co']

const PUNCTUATION_CHINESE =
  '\u3002\uff1f\uff01\uff0c\u3001\uff1b\uff1a\u201c\u201d\u2018\u2019\uff08\uff09\u300a\u300b\u3008\u3009\u3010\u3011\u300e\u300f\u300c\u300d\ufe43\ufe44\u3014\u3015\u2026\u2014\uff5e\ufe4f\uffe5'
const PUNCTUATION_ASCII = '\x00-\x2f\x3a-\x40\x5b-\x60\x7a-\x7f'
const REGEXP_ALL_PUNCTUATIONS = new RegExp(
  `^[${PUNCTUATION_CHINESE}${PUNCTUATION_ASCII}]*$`,
  'g'
)

export const isValidEmail = (str: string, options: ValidEmailOptions) => {
  const { allowPlusSign } = options
  const isInWhitelist = EMAIL_DOMAIN_WHITELIST.indexOf(str.split('@')[1]) >= 0

  // check "+" sign
  if (!allowPlusSign && !isInWhitelist && str.indexOf('+') >= 0) {
    return false
  }

  return isEmail(str, {
    allow_utf8_local_part: false,
  })
}

/**
 * Validate user name. It only accepts alphabets, numbers and _.
 *
 * @see https://mattersnews.slack.com/archives/G8877EQMS/p1546446430005500
 */

export const isValidUserName = (name: string): boolean => {
  if (
    !name ||
    name.length < 4 ||
    name.length > 15 ||
    RESERVED_NAMES.includes(name.toLowerCase())
  ) {
    return false
  }

  if (REGEXP_ALL_PUNCTUATIONS.test(name)) {
    return false
  }

  return /^[a-zA-Z0-9_]*$/.test(name)
}

/**
 * Validate user display name.
 *
 * @see https://mattersnews.slack.com/archives/G8877EQMS/p1546446430005500
 */
export const isValidDisplayName = (name: string, maxLen = 20): boolean => {
  if (
    !name ||
    name.length < 2 ||
    name.length > maxLen ||
    RESERVED_NAMES.includes(name.toLowerCase())
  ) {
    return false
  }

  return !REGEXP_ALL_PUNCTUATIONS.test(name)
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
 * Validate payment pass word. It only accepts digital.
 */
export const isValidPaymentPassword = (password: string): boolean => {
  if (!password || password.length !== 6) {
    return false
  }

  return /^[\d]*$/.test(password)
}

/**
 * Validate tag name.
 *
 */
export const isValidTagName = (name: string, maxLen = 20): boolean => {
  return !REGEXP_ALL_PUNCTUATIONS.test(name)
}

/**
 * Validate circle name. It only accepts alphabets, numbers and _.
 */
export const isValidCircleName = (name: string): boolean => {
  if (!name || name.length < 2 || name.length > 20) {
    return false
  }

  if (REGEXP_ALL_PUNCTUATIONS.test(name)) {
    return false
  }

  return /^[a-zA-Z0-9_]*$/.test(name)
}
