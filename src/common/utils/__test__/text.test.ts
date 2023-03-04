import {
  cutWords,
  normalizeQueryInput,
  // normalizeTagInput,
  stripAllPunct,
  tagSlugify,
} from 'common/utils'

test('stripAllPunct', () => {
  const pairs = [
    { tag: '', expected: '' },

    { tag: '#LikeCoin', expected: 'LikeCoin' },
    { tag: '#LikeCoin#', expected: 'LikeCoin' },
    { tag: '#Likecoin', expected: 'Likecoin' },

    { tag: 'CATCHPLAY+', expected: 'CATCHPLAY' },

    { tag: '#小說', expected: '小說' },
    { tag: '＃小說', expected: '小說' },
    { tag: '＃小說＃', expected: '小說' },
    { tag: '＃小說 ＃ ', expected: '小說' },

    // strip all nonAlphaNumber to a single space
    { tag: '＃亞森．羅蘋 ＃ ', expected: '亞森 羅蘋' },
    { tag: '蜘蛛人：返校日 2022 #', expected: '蜘蛛人 返校日2022' },

    // count including prefix and suffix
    { tag: '| 蜘蛛人：返校日 2022 #', expected: '蜘蛛人 返校日2022' },
    { tag: ' Web3 web2.0 | web3 #', expected: 'Web3 web20web3' },
  ]

  pairs.forEach(({ tag, expected }) =>
    expect(stripAllPunct(tag)).toBe(expected)
  )
})

test('tagSlugify', () => {
  const pairs = [
    { tag: '', expected: '' },

    { tag: '#LikeCoin', expected: 'LikeCoin' },
    { tag: '#LikeCoin#', expected: 'LikeCoin' },
    { tag: '#Likecoin', expected: 'Likecoin' },

    { tag: 'CATCHPLAY+', expected: 'CATCHPLAY' },

    { tag: '#小說', expected: '小說' },
    { tag: '＃小說', expected: '小說' },
    { tag: '＃小說＃', expected: '小說' },
    { tag: '＃小說 ＃ ', expected: '小說' },
    { tag: '小說  ', expected: '小說' },
    { tag: '小說 #  ', expected: '小說' },

    { tag: '簽？不簽？', expected: '簽-不簽' },

    { tag: '#华人VPN', expected: '华人VPN' },
  ]

  pairs.forEach(({ tag, expected }) => expect(tagSlugify(tag)).toBe(expected))
})

test('normalizeQueryInput', async () => {
  expect(await normalizeQueryInput('')).toBe('')
  expect(await normalizeQueryInput('小說')).toBe('小说')
  expect(await normalizeQueryInput('Abc')).toBe('abc')
  expect(await normalizeQueryInput(' Abc小說')).toBe('abc小说')
})

test('cutWords', async () => {
  expect(await cutWords('电影音乐')).toEqual(['电影', '音乐'])
})
