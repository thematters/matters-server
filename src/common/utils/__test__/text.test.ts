import { stripAllPunct, tagSlugify } from 'common/utils'

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
    { tag: '蜘蛛人：返校日 2022 #', expected: '蜘蛛人 返校日 2022' },
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
