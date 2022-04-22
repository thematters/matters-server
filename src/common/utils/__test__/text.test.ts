import { stripPunctPrefixSuffix, tagSlugify } from 'common/utils'

test('stripPunctPrefixSuffix', () => {
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
  ]

  pairs.forEach(({ tag, expected }) =>
    expect(stripPunctPrefixSuffix(tag)).toBe(expected)
  )
})

test('tagSlugify', () => {
  const pairs = [
    { tag: '', expected: '' },

    { tag: '#LikeCoin', expected: 'likecoin' },
    { tag: '#LikeCoin#', expected: 'likecoin' },
    { tag: '#Likecoin', expected: 'likecoin' },

    { tag: 'CATCHPLAY+', expected: 'catchplay' },

    { tag: '#小說', expected: '小說' },
    { tag: '＃小說', expected: '小說' },
    { tag: '＃小說＃', expected: '小說' },
    { tag: '＃小說 ＃ ', expected: '小說' },
    { tag: '小說  ', expected: '小說' },
    { tag: '小說 #  ', expected: '小說' },

    { tag: '簽？不簽？', expected: '簽-不簽' },

    { tag: '#华人VPN', expected: '华人vpn' },
  ]

  pairs.forEach(({ tag, expected }) => expect(tagSlugify(tag)).toBe(expected))
})
