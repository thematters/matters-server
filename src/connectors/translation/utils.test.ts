import { toGoogleTargetLanguage } from './utils'

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
