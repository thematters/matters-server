export * from './makeContext'
export * from './globalId'
export * from './initSubscriptions'
export * from './connections'
export * from './validator'
export * from './notice'

export const stripHtml = (html: string) => html.replace(/(<([^>]+)>)/gi, '')

export const countWords = (html: string) =>
  stripHtml(html)
    .split(' ')
    .filter(s => s !== '').length
