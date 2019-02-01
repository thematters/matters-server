import { LANGUAGES } from 'definitions'

type TranslationFn<V> = (vars: V) => string
type Translations<V> = {
  zh_hant: string | TranslationFn<V>
  zh_hans?: string | TranslationFn<V>
  en?: string | TranslationFn<V>
}
type TransFn<V> = (lang: LANGUAGES, vars: V) => string

/**
 *
 * Usage:
 *
 * ```
 *  const t = i18n<{ index: number }>({
 *    zh_hant: ({ index }) => `項 ${index}`,
 *    zh_hans: ({ index }) => `项 ${index}`,
 *    en: ({ index }) => `Item ${index}`
 *  })
 *
 *  t(zh_hant, { index: 1 }) // "Item 1"
 * ```
 *
 */
export const i18n = <V>(translations: Translations<V>): TransFn<V> => {
  return (lang, vars) => {
    const trans = translations[lang] || translations['zh_hant']

    if (typeof trans === 'string') {
      return trans
    }

    return trans(vars)
  }
}
