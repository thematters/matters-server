import * as cheerio from 'cheerio'
import flow from 'lodash/flow'

export const stripHtml = (html: string, replacement = ' ') =>
  (String(html) || '')
    .replace(/(<\/p><p>|&nbsp;)/g, ' ') // replace line break and space first
    .replace(/(<([^>]+)>)/gi, replacement)

export const countWords = (html: string) => {
  const matches = stripHtml(html).match(/[\u4e00-\u9fcc]|\w+/g)
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
 * Output clean HTML for IPFS
 */
export const outputCleanHTML = (html: string) => {
  /**
   * Note: enable `xmlMode` to remove default wrapper
   *
   * @see https://github.com/cheeriojs/cheerio/issues/1031#issuecomment-368307598
   */
  const $ = cheerio.load(html, { decodeEntities: false, xmlMode: true })

  // remove audio player
  $('.player').remove()

  return $.html()
}

/**
 * Strip specific class from html string
 */
export const stripClass = (html: string, name: string) => {
  const $ = cheerio.load(html, { decodeEntities: false, xmlMode: true })

  $(`.${name}`).removeClass(name)

  return $.html()
}

/**
 * Correct self-closing tag
 */
export const correctSelfClosingHtmlTag = (name: string) => (html: string) => {
  const pattern = new RegExp(`<${name}(.*?)\s*\/>`, 'g')
  const replacement = `<${name}$1></${name}>`
  return (html || '').replace(pattern, replacement)
}

/**
 * Pipe for pre-processing html tag.
 */
export const correctHtml = (html: string) => {
  const pipe = flow(correctSelfClosingHtmlTag('iframe'))
  return pipe(html)
}
