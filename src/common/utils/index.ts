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

export const stripHtml = (html: string, replacement = ' ') =>
  (html || '')
    .replace(/(<\/p><p>|&nbsp;)/g, ' ') // replace line break and space first
    .replace(/(<([^>]+)>)/gi, replacement)

export const countWords = (html: string) => {
  const matches = stripHtml(html).match(/[\u4e00-\u9fcc]|\S+/g)

  return matches ? matches.length : 0
}

export const makeSummary = (html: string, length = 140) => {
  // buffer for search
  const buffer = 20

  // split on sentence breaks
  const sections = stripHtml(html, '')
    .replace(/([?!。？！]|(\.\s))\s*/g, '$1|')
    .split('|')

  // grow summary within buffer
  let summary = ''
  while (summary.length < length - buffer && sections.length > 0) {
    const el = sections.shift() || ''

    const addition =
      el.length + summary.length > length + buffer
        ? `${el.substring(0, length - summary.length)}...`
        : el

    summary = summary.concat(addition)
  }

  return summary
}

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
