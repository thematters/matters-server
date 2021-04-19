import { stripHtml } from '@matters/matters-html-formatter'
import * as cheerio from 'cheerio'
import fill from 'lodash/fill'
import flow from 'lodash/flow'
import range from 'lodash/range'

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
 * Correct sepecific nested br tag produced by third-party lib.
 */
export const correctNestedBrTag = () => (html: string) => {
  const $ = cheerio.load(html, { decodeEntities: false, xmlMode: true })
  const base = '<br class="smart">'

  let cleanedHtml = html
  $('blockquote > br.smart, p > br.smart').each((i, node) => {
    const dom = $(node)
    if (dom) {
      const inner = dom.html() || ''
      const content = inner.replace(
        '<br class="smart"/>',
        '<br class="smart" />'
      )
      const num = dom.find('br.smart').length + 1
      const match = `${base}${content}</br>`
      const sub = fill(range(num), base).join('')
      cleanedHtml = cleanedHtml.replace(match, sub)
    }
  })

  return cleanedHtml
}

/**
 * Pipe for pre-processing html tag.
 */
export const correctHtml = (html: string) => {
  const pipe = flow(correctSelfClosingHtmlTag('iframe'))
  return pipe(html)
}
