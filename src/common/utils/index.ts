export * from './makeContext'
export * from './globalId'
export * from './initSubscriptions'
export * from './validator'

export const stripHtml = (html: string) => html.replace(/(<([^>]+)>)/gi, '')

export const countWords = (html: string) =>
  stripHtml(html)
    .split(' ')
    .filter(s => s !== '').length

/**
 * Make a valid user name based on a given email address. It removes all special characters including _.
 * Also, leave 3 charateres for appending postfix when it's a duplicated user name.
 */
export const makeUserName = (email: string): string =>
  email
    .substring(0, email.lastIndexOf('@'))
    .replace(
      /[^A-Za-z0-9\u4E00-\u9FFF\u3400-\u4DFF\uF900-\uFAFF\u2e80-\u33ffh]/g,
      ''
    )
    .substring(0, 18)
