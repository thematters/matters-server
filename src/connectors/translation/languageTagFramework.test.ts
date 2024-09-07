import { Bcp47, Cldr } from './languageTagFramework'

describe('BCP 47', () => {
  it.each([
    ['zh-Hans-CN', 'zh'],
    ['Zh-Hans-CN', 'zh'],
    ['ZH-Hans-CN', 'zh'],
    ['zh', 'zh'],
    ['en', 'en'], // ISO 639-1
    ['eng', 'eng'], // ISO 639-2/3
  ])('parses language sub-tag %s', (tags: string, expected: string) => {
    const bcp47 = new Bcp47(tags)
    expect(bcp47.language()).toBe(expected)
  })

  it.each([
    ['zh-Hans-CN', 'Hans'],
    ['zh-Hans', 'Hans'],
    ['zh-hans', 'Hans'],
    ['zh-CN', null],
    ['zh', null],
  ])('parses script sub-tag %s', (tags: string, expected: string | null) => {
    const bcp47 = new Bcp47(tags)
    expect(bcp47.script()).toBe(expected)
  })

  it.each([
    ['zh-Hans-CN', 'CN'],
    ['zh-CN', 'CN'],
    ['zh-cn', 'CN'],
    ['zh-Hans', null],
    ['zh', null],
  ])('parses region sub-tag %s', (tags: string, expected: string | null) => {
    const bcp47 = new Bcp47(tags)
    expect(bcp47.region()).toBe(expected)
  })

  it('throws error when value is empty', () => {
    expect(() => new Bcp47('')).toThrow('The value is empty.')
    expect(() => new Bcp47(' ')).toThrow('The value is empty.')
  })

  it('throws error when language sub-tag is not iso 639-1 & 639-2/3', () => {
    expect(() => new Bcp47('fooo')).toThrow(
      'The language sub-tag does not conform to ISO 639-1 or 639-2/3.'
    )
  })

  it.each([
    ['zh-Hans-CN', 'zh-Hans-CN'],
    ['zh-Hans', 'zh-Hans'],
    ['zh-hans', 'zh-Hans'],
    ['zh-CN', 'zh-CN'],
    ['zh-cn', 'zh-CN'],
    ['ZH', 'zh'],
    ['en', 'en'],
  ])('returns normalized value %s', (value: string, expected: string) => {
    const bcp47 = new Bcp47(value)
    expect(bcp47.value).toBe(expected)
  })

  it.each([
    ['zh_CN', 'zh-CN'],
    ['zh_Hans', 'zh-Hans'],
    ['zh_Hans_CN', 'zh-Hans-CN'],
    ['zh', 'zh'],
  ])('creates an instance from cldr tags', (cldr: string, bcp47: string) => {
    expect(Bcp47.from(new Cldr(cldr)).value).toBe(bcp47)
  })
})

describe('CLDR', () => {
  it('parses value by underscore seperator', () => {
    const cldr = new Cldr('en_US')
    expect(cldr.value).toBe('en_US')
  })

  it.each([
    ['zh-CN', 'zh_CN'],
    ['zh-Hans', 'zh_Hans'],
    ['zh-Hans-CN', 'zh_Hans_CN'],
    ['zh', 'zh'],
  ])(
    'creates an instance from bcp 47 tags %s',
    (bcp47: string, cldr: string) => {
      expect(Cldr.from(new Bcp47(bcp47)).value).toBe(cldr)
    }
  )
})
