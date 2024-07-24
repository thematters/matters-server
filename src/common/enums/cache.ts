// cache TTL in seconds
export const CACHE_TTL = {
  PUBLIC_QUERY: 60 * 60 * 24, // 1 day
  PUBLIC_FEED_ARTICLE: 60 * 3, // 3 mins
  PUBLIC_FEED_TAG: 60 * 3, // 3 mins
  PUBLIC_FEED_USER: 60 * 30, // 30 mins
  PUBLIC_SEARCH: 60 * 60 * 3, // 3 hours

  PRIVATE_QUERY: 60 * 3, // 3 mins

  ANALYTICS: 60 * 30, // 30 mins

  STATIC: 60 * 60 * 24 * 10, // 10 days for static data
  LONG: 60 * 60 * 24, // 1 day
  MEDIUM: 60 * 60, // 1 hour
  SHORT: 60 * 3, // 3 mins
  INSTANT: 0, // no cache
}

// keyword notating for cache invalidation
export const CACHE_KEYWORD = '__invalid_nodes__'

// redis cache for apq keys or resolver returned objects
export const CACHE_PREFIX = {
  OBJECTS: 'cache-objects',
  NFTS: 'cache-alchemy-nfts',
  OPERATION_LOG: 'operation-log',
  LIKECOIN: 'likecoin',
  CIVIC_LIKER: 'civic-liker',
  USER_LAST_SEEN: 'cache-user-last-seen',
  EMAIL_DOMAIL_WHITELIST: 'cache-email-domain-whitelist',
  TAG_COVERS: 'cache-tag-covers',
}

export const DEFAULT_IPNS_LIFETIME = '7200h' // the maximum, is 300days, almost 1 year
