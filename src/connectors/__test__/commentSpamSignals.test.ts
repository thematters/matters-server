import {
  classifyContentTier,
  hasContact,
  hasSolicit,
  jaccard,
  nearDuplicate,
  normalizeForDup,
  shingles,
  stripHtml,
  TIER_REASON,
} from '../commentSpamSignals.js'

// Real high-score examples from matters_prod (anonymized snippets) drive these
// cases: the >= 0.94 band mixes blatant spam with creative writing / replies,
// and only the contact+solicitation conjunction separates them cleanly.

describe('stripHtml', () => {
  test('removes tags, entities, and collapses whitespace', () => {
    expect(stripHtml('<p>hi</p>&nbsp;<b>there</b>  now')).toBe('hi there now')
  })
})

describe('hasContact', () => {
  test.each([
    'Contact us ➤Telegram: @smmbigmarket',
    'Call Us – 8447779280 Call Girls',
    '官網 www.ppp8669.com',
    'visit mtmis.org.pk for details',
    'add my line id: abc123',
  ])('detects contact channel: %s', (text) => {
    expect(hasContact(text)).toBe(true)
  })

  test.each([
    '問世間情為何物。孟婆的癡情令人心疼。',
    '感謝你的分享，我很喜歡這個觀點。',
  ])('does not fire on plain prose: %s', (text) => {
    expect(hasContact(text)).toBe(false)
  })
})

describe('hasSolicit', () => {
  test.each([
    '台灣外送茶推薦 約妹服務',
    'Where to Buy Verified Paxum Accounts',
    'football betting predictions and odds',
    '全套服務 莞式',
  ])('detects solicitation: %s', (text) => {
    expect(hasSolicit(text)).toBe(true)
  })

  test('does not fire on benign creative writing', () => {
    expect(hasSolicit('紀子璇作為楊羽棠管家的最後一天定在夏天的尾聲')).toBe(false)
  })
})

describe('classifyContentTier', () => {
  const threshold = 0.94

  test('returns null when there is no threshold', () => {
    expect(
      classifyContentTier({ score: 0.99, content: 'x', threshold: null })
    ).toBeNull()
  })

  test('returns null when the score is below the threshold', () => {
    expect(
      classifyContentTier({ score: 0.5, content: 'x', threshold })
    ).toBeNull()
  })

  test('Tier A (auto) for contact + solicitation', () => {
    expect(
      classifyContentTier({
        score: 0.984,
        content:
          '<p>賴/大G:sk3826 台灣外送茶推薦 約妹服務 官網 www.ppp8669.com</p>',
        threshold,
      })
    ).toBe('auto')
  })

  test('Tier A for English escort ad with phone', () => {
    expect(
      classifyContentTier({
        score: 0.996,
        content: 'Call Us – 8447779280 Call Girls In Chanakyapuri Escorts',
        threshold,
      })
    ).toBe('auto')
  })

  test('Tier C (review) for high-score creative writing (no contact/solicit)', () => {
    expect(
      classifyContentTier({
        score: 0.992,
        content:
          '<p>紀子璇作為楊羽棠管家的最後一天定在夏天的尾聲，她還沒有找到工作。</p>',
        threshold,
      })
    ).toBe('review')
  })

  test('Tier C for a genuine reply that only mentions a keyword (no contact)', () => {
    // "下注" alone (discussing own betting losses) must NOT be auto-acted.
    expect(
      classifyContentTier({
        score: 0.957,
        content: '隔夜裂口 大勝後盲目下注 星期一及星期五共損手6萬',
        threshold,
      })
    ).toBe('review')
  })

  test('Tier C for an @mention reply (contact-pattern but no solicitation)', () => {
    expect(
      classifyContentTier({
        score: 0.992,
        content: '@VietJoe333 請AI處理的，我懶得打馬賽克',
        threshold,
      })
    ).toBe('review')
  })
})

describe('near-duplicate ring helpers', () => {
  test('shingles produces trigrams and handles short strings', () => {
    expect(shingles('abcd')).toEqual(new Set(['abc', 'bcd']))
    expect(shingles('ab')).toEqual(new Set(['ab']))
    expect(shingles('')).toEqual(new Set())
  })

  test('jaccard of identical sets is 1, disjoint is 0', () => {
    expect(jaccard(new Set(['a']), new Set(['a']))).toBe(1)
    expect(jaccard(new Set(['a']), new Set(['b']))).toBe(0)
    expect(jaccard(new Set(), new Set())).toBe(0)
  })

  test('normalizeForDup masks urls, handles, digits, punctuation', () => {
    expect(normalizeForDup('<p>Hi @bob! call 0912-345 http://x.co </p>')).toBe(
      'hicall'
    )
  })

  test('nearDuplicate matches the same template with rotated contact info', () => {
    const a = '加賴 abc123 全套服務到府 官網 www.aaa.com 約妹首選'
    const b = '加賴 xyz789 全套服務到府 官網 www.bbb.net 約妹首選'
    expect(nearDuplicate(a, b)).toBe(true)
  })

  test('nearDuplicate does not merge genuinely different texts', () => {
    expect(
      nearDuplicate(
        '今天天氣很好我去公園散步看到很多花',
        '股市今天大跌我虧了很多錢心情很差'
      )
    ).toBe(false)
  })

  test('nearDuplicate falls back to exact match for too-short content', () => {
    expect(nearDuplicate('hi', 'hi')).toBe(true)
    expect(nearDuplicate('hi', 'yo')).toBe(false)
  })
})

describe('TIER_REASON', () => {
  test('maps every tier to a worker reason key', () => {
    expect(TIER_REASON).toEqual({
      auto: 'spam_auto',
      ring: 'spam_ring',
      review: 'spam_review',
    })
  })
})
