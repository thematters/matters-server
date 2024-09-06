import { LANGUAGE } from 'common/enums'
import { Bcp47, Cldr } from './languageTagFramework'

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

/**
 * Normalize the BCP-47 tags into Matters internal language code.
 */
export function toInternalLanguage(bcp47: string) {
  const tags = new Bcp47(bcp47)

  switch (true) {
    case tags.script() === 'Hans':
    case tags.region() === 'CN':
      return LANGUAGE.zh_hans
    case tags.script() === 'Hant':
    case tags.region() === 'TW':
      return LANGUAGE.zh_hant
    default:
      return bcp47
  }
}
