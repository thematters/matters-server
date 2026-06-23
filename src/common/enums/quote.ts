export const QUOTE_STATE = {
  active: 'active',
  archived: 'archived',
  banned: 'banned',
} as const

// a quote is a "one-glance" excerpt; longer text is a paragraph, not a quote
export const MAX_QUOTE_LENGTH = 80
