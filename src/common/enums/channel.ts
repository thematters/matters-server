export const CURATION_CHANNEL_STATE = {
  editing: 'editing',
  published: 'published',
  archived: 'archived',
} as const

export const CURATION_CHANNEL_COLOR = {
  gray: 'gray',
  brown: 'brown',
  orange: 'orange',
  yellow: 'yellow',
  green: 'green',
  purple: 'purple',
  pink: 'pink',
  red: 'red',
} as const

export const TOPIC_CHANNEL_PIN_LIMIT = 6
export const TAG_CHANNEL_PIN_LIMIT = 3

export const CHANNEL_ANTIFLOOD_WINDOW = 24 // hours
export const CHANNEL_ANTIFLOOD_LIMIT_PER_WINDOW = 2 // articles
