import _ from 'lodash'

export * from './makeContext'
export * from './globalId'
export * from './initSubscriptions'
export * from './connections'
export * from './validator'
export * from './notice'
export * from './getViewerFromHeaders'

export const stripHtml = (html: string) => html.replace(/(<([^>]+)>)/gi, '')

export const countWords = (html: string) =>
  stripHtml(html)
    .split(' ')
    .filter(s => s !== '').length

export const makeSummary = (string: string) =>
  _.truncate(string, {
    length: 200,
    separator: /,? +/
  })

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
