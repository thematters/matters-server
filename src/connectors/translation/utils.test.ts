import { LANGUAGE } from 'common/enums'
import { toGoogleTargetLanguage, toInternalLanguage } from './utils'

describe('toGoogleTargetLanguage', () => {
  it('converts language in cldr format to iso-639 code', () => {
    expect(toGoogleTargetLanguage('en')).toBe('en')
    expect(toGoogleTargetLanguage('en_US')).toBe('en')
  })

  it('converts language to Chinese Simplified if script sub-tag is Hans', () => {
    expect(toGoogleTargetLanguage('zh_Hans')).toBe('zh-CN')
  })

  it('converts language to Chinese Simplified if region sub-tag is CN', () => {
    expect(toGoogleTargetLanguage('zh_CN')).toBe('zh-CN')
  })

  it('converts language to Chinese Traditional if script sub-tag is Hant', () => {
    expect(toGoogleTargetLanguage('zh_Hant')).toBe('zh-TW')
  })

  it('converts language to Chinese Traditional if region sub-tag is TW', () => {
    expect(toGoogleTargetLanguage('zh_TW')).toBe('zh-TW')
  })
})

describe('toInternalLanguage', () => {
  it('normalizes to Simplified Chinese if script sub-tag is Hans', () => {
    expect(toInternalLanguage('zh-Hans')).toBe(LANGUAGE.zh_hans)
  })

  it('normalizes to Simplified Chinese if region sub-tag is CN', () => {
    expect(toInternalLanguage('zh-CN')).toBe(LANGUAGE.zh_hans)
  })

  it('normalizes to Traditional Chinese if script sub-tag is Hant', () => {
    expect(toInternalLanguage('zh-Hant')).toBe(LANGUAGE.zh_hant)
  })

  it('normalizes to Traditional Chinese if region sub-tag is TW', () => {
    expect(toInternalLanguage('zh-TW')).toBe(LANGUAGE.zh_hant)
  })

  it('skips normalizing for any other BCP 47 codes', () => {
    expect(toInternalLanguage('en')).toBe(LANGUAGE.en)
    expect(toInternalLanguage('en-US')).toBe('en-US')
    expect(toInternalLanguage('fr')).toBe('fr')
  })
})
