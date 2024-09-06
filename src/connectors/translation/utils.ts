import { Cldr } from './languageTagFramework'

/**
 * Convert language in CLDR format to Google Translate target language code.
 *
 * @see https://cloud.google.com/translate/docs/languages
 */
export function toGoogleTargetLanguage(cldr: string) {
  const tags = new Cldr(cldr)

  switch (true) {
    case tags.script() === 'Hans':
    case tags.region() === 'CN':
      return 'zh-CN'
    case tags.script() === 'Hant':
    case tags.region() === 'TW':
      return 'zh-TW'
    default:
      return tags.language()
  }
}
