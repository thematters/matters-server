import { stripHtml } from '@matters/matters-html-formatter'
import * as cheerio from 'cheerio'
import cloneDeep from 'lodash/cloneDeep'
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
 * Correct sepecific nested br tag produced by third-party lib.
 */
export const correctNestedBrTag = () => (html: string) => {
  const $ = cheerio.load(html, { decodeEntities: false, xmlMode: true })
  const base = '<br class="smart">'
  const selector = 'br.smart'

  let output = html
  $('blockquote > br.smart, p > br.smart').each((i, dom) => {
    const node = $(dom)

    if (!dom || !node) {
      return
    }

    let skip = false
    let curr: any = node
    const nodes: any[] = []

    // gather sub nodes
    while (curr) {
      const temp = cloneDeep(curr)
      temp.find('br.smart').remove()
      nodes.push({ content: temp.html() })

      const sub = curr.children(selector).toArray()
      if (sub && sub.length > 1) {
        skip = true
        break
      }
      curr = sub && sub.length ? $(sub[0]) : undefined
    }

    if (skip || nodes.length === 0) {
      return
    }

    // replace entire parapgraph
    const content = (node.html() || '').replace(
      '<br class="smart"/>',
      '<br class="smart" />'
    )
    const match = `${base}${content}</br>`
    const replacement = nodes.map((sub) => `${base}${sub.content}`).join('')

    output = output.replace(match, replacement)
  })

  return output
}

/**
 * Pipe for pre-processing html tag.
 */
export const correctHtml = (html: string) => {
  const pipe = flow(correctSelfClosingHtmlTag('iframe'), correctNestedBrTag())
  return pipe(html)
}
