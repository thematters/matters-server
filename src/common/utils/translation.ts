import { getLogger } from '#common/logger.js'
import { GQLTranslationModel } from '#definitions/index.js'
import * as cheerio from 'cheerio'

const logger = getLogger('utils-translation')

type HtmlTextNode = {
  node: any
  text: string
}

/**
 * Extracts and translates text from HTML while preserving document structure.
 * Uses a translator function to process text nodes in batches, then reinserts
 * translations back into the original HTML, maintaining all formatting and attributes.
 *
 * @param html The HTML content to process
 * @param translator Optional callback function that takes extracted texts and returns translations
 *
 * @returns Processed HTML result with translated HTML
 */
export const extractAndTranslateHtml = async (
  html: string,
  translator: (
    texts: string[]
  ) => Promise<{ translations: string[]; model: GQLTranslationModel }>
): Promise<
  | {
      html: string
      model: GQLTranslationModel
    }
  | undefined
> => {
  // Extract text nodes from HTML
  const $ = cheerio.load(html, null, false)

  // Extract all text nodes
  const nodes: HtmlTextNode[] = []
  $('*')
    .contents()
    .each((_, element) => {
      if (element.type === 'text' && element.data.trim()) {
        const parent = element.parent
        const parentTagName = parent && 'name' in parent ? parent.name : null
        const grandparent = parent && parent.parent
        const grandparentTagName =
          grandparent && 'name' in grandparent ? grandparent.name : null

        const isParentMention =
          parent &&
          parentTagName === 'a' &&
          'attribs' in parent &&
          parent.attribs.class === 'mention'
        const isGrandparentMention =
          grandparent &&
          grandparentTagName === 'a' &&
          'attribs' in grandparent &&
          grandparent.attribs.class === 'mention'

        // Skip script, style, and mention elements
        if (
          parentTagName &&
          !['script', 'style'].includes(parentTagName.toLowerCase()) &&
          !isParentMention &&
          !isGrandparentMention
        ) {
          nodes.push({ node: element, text: element.data })
        }
      }
    })

  // Get all text content
  const texts = nodes.map((node) => node.text)

  // If no text to translate or no translator provided
  if (nodes.length === 0) {
    return
  }

  // Call the translator function
  try {
    const { translations, model } = await translator(texts)

    // Check if segments count matches
    if (translations.length !== nodes.length) {
      logger.error(
        `Translation segments mismatch: expected ${nodes.length}, got ${translations.length}`
      )
      return
    }

    // Apply translations to HTML
    nodes.forEach((item, index) => {
      if (translations[index]) {
        item.node.data = item.node.data.replace(item.text, translations[index])
      }
    })

    return {
      html: $.html(),
      model,
    }
  } catch (error) {
    logger.error('Translation error:', error)
    return
  }
}
