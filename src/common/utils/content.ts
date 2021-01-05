import { stripHtml } from '@matters/matters-html-formatter'
import * as cheerio from 'cheerio'
import flow from 'lodash/flow'

export const countWords = (html: string) => {
  const matches = stripHtml(html).match(/[\u4e00-\u9fcc]|\w+/g)
  return matches ? matches.length : 0
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
