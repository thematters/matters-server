import { getLanguage } from 'common/utils/index.js'

test('getLanguageTest', () => {
  const pairs = [
    { header: 'en-US,en;q=0.9', expected: 'en' },
    { header: 'zh-tw', expected: 'zh_hant' },
    { header: 'zh-cn', expected: 'zh_hans' },
    { header: 'zh', expected: 'zh_hant' },
    { header: '', expected: 'zh_hant' },
    { header: 'es-MX', expected: 'zh_hant' },
    { header: 'ja-JP', expected: 'zh_hant' },
    { header: 'ru-RU', expected: 'zh_hant' },
    { header: undefined, expected: 'zh_hant' },
  ]

  pairs.forEach(({ header, expected }) =>
    expect(getLanguage(header)).toBe(expected)
  )
})
