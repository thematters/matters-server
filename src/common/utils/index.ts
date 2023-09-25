import { hash } from 'bcrypt'
import * as cheerio from 'cheerio'

import { BCRYPT_ROUNDS } from 'common/enums'
import { environment } from 'common/environment'

export * from './getFileName'
export * from './getLanguage'
export * from './getViewer'
export * from './globalId'
export * from './connections'
export * from './validator'
export * from './notice'
export * from './getViewer'
export * from './cookie'
export * from './removeEmpty'
export * from './content'
export * from './scope'
export * from './payment'
export * from './text'
export * from './time'
export * from './blockchain'
export * from './ipfs'
export * from './IERC1271'
export * from './genDisplayName'
export * from './counter'
export * from './verify'

/**
 * Make a valid user name based on a given email address. It removes all special characters including _.
 * Also, leave 3 charateres for appending postfix when it's a duplicated user name.
 */
export const makeUserName = (email: string): string => {
  const matched = email.split('@')[0].match(/[a-zA-Z0-9_]*/g)

  if (!matched) {
    return ''
  }

  return matched.join('').substring(0, 12).toLowerCase()
}

export const extractAssetDataFromHtml = (
  html: string,
  type?: 'image' | 'audio'
) => {
  const $ = cheerio.load(html || '', { decodeEntities: false })

  let selector = '[data-asset-id]'

  if (type === 'image') {
    selector = 'figure.image [data-asset-id]'
  } else if (type === 'audio') {
    selector = 'figure.audio [data-asset-id]'
  }

  return $(selector)
    .map((index, element) => {
      const uuid = $(element).attr('data-asset-id')

      if (uuid) {
        return uuid
      }
    })
    .get()
}

export const generatePasswordhash = (password: string) =>
  hash(password, BCRYPT_ROUNDS)

/**
 * Generate redirect link for registeration
 */
export const generateRegisterRedirectUrl = ({
  email,
  displayName,
}: {
  email: string
  displayName: string
}) =>
  `https://${environment.siteDomain}/signup?email=${encodeURIComponent(
    email
  )}&displayName=${encodeURIComponent(displayName)}`

export const getFileName = (disposition: string, url: string) => {
  if (disposition) {
    const match = disposition.match(/filename="(.*)"/) || []
    if (match.length >= 2) {
      return decodeURI(match[1])
    }
  }

  if (url) {
    const fragment = url.split('/').pop()
    if (fragment) {
      return fragment.split('?')[0]
    }
  }
}

// not yet supports for TLD like .co.jp
// use https://www.npmjs.com/package/psl if needed
export const extractRootDomain = (url: string) => {
  // eslint-disable-next-line no-useless-escape
  const parts = url.match(/^(https?\:\/\/)?([^\/?#]+)(?:[\/?#]|$)/i)

  if (!parts) {
    return
  }

  return parts[2].split('.').slice(-2).join('.')
}
