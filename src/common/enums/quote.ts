export const QUOTE_STATE = {
  active: 'active',
  archived: 'archived',
  banned: 'banned',
} as const

// a quote is a "one-glance" excerpt; longer text is a paragraph, not a quote
export const MAX_QUOTE_LENGTH = 80

// anti-abuse caps (product-decided defaults, tunable)
export const QUOTE_DAILY_LIMIT = 5
export const QUOTE_PER_ARTICLE_LIMIT = 2
