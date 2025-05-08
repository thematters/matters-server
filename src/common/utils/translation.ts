/**
 * Replaces URLs in HTML content with placeholders to reduce token usage
 *
 * @param html The HTML content
 * @returns Object containing processed HTML and a map of placeholders to original URL values
 */
export const extractAndReplaceUrls = (
  html: string
): {
  html: string
  urlMap: Map<string, string>
} => {
  const urlMap = new Map<string, string>()
  let counter = 0

  // Match URLs in HTML attributes (src, href, etc.)
  const attributeRegex = /\b(src|href|srcset)=['"]([^'"]+)['"]/gi

  const processedHtml = html.replace(attributeRegex, (match, attr, url) => {
    const placeholder = `URL${counter}`
    urlMap.set(placeholder, url)
    counter++
    return `${attr}="${placeholder}"`
  })

  return {
    html: processedHtml,
    urlMap,
  }
}

/**
 * Restore original URL values from placeholders
 *
 * @param html The HTML content with placeholders
 * @param urlMap Map of placeholders to original URL values
 * @returns HTML with original URL values restored
 */
export const restoreUrlPlaceholders = (
  html: string,
  urlMap: Map<string, string>
): string => {
  let result = html

  // Use attribute regex similar to extraction
  const attributeRegex = /\b(src|href|srcset)=["'](URL\d+)["']/gi

  result = result.replace(attributeRegex, (match, attr, placeholder) => {
    const originalUrl = urlMap.get(placeholder)
    if (!originalUrl) return match
    return `${attr}="${originalUrl}"`
  })

  return result
}
