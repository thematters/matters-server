export const SEARCH_API_VERSION = {
  v20230601: 'v20230601',
  v20230301: 'v20230301',
} as const

export const SEARCH_EXCLUDE = {
  blocked: 'blocked',
} as const

export const SEARCH_KEY_TRUNCATE_LENGTH = 100

export const SEARCH_ARTICLE_URL_REGEX =
  /^(https:\/\/([a-z0-9-]+.)?matters.(town|news)\/)@([a-zA-Z0-9_-]+)\/(.+?)-([0-9a-zA-Z]{49,59})$/gi
