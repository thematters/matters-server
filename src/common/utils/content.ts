import { stripHtml } from '@matters/ipns-site-generator'

export const countWords = (html: string) => {
  // Chinese(\u4e00-\u9fcc); Korean(\uac00-\ud7af); Japanese(\u3040-\u309f\u30a0-\u30ff); Russian([\u0401\u0451\u0410-\u044f]+)
  const regex =
    /[\u4e00-\u9fcc]|[\uac00-\ud7af]|[\u3040-\u309f\u30a0-\u30ff]|[\u0401\u0451\u0410-\u044f]+|\w+/g
  const content = stripHtml(html).trim()
  const matches = content.match(regex)

  const matchesLen = matches ? matches.length : 0
  const splitLen = content.split(/\s+/g).length

  if (matchesLen >= splitLen) {
    return matchesLen
  } else if (content.length > 0) {
    // fallback
    return splitLen
  } else {
    return 0
  }
}
