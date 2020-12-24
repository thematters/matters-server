// cache TTL in seconds
export const CACHE_TTL = {
  PUBLIC_QUERY: 60 * 60 * 24, // 1 day
  PUBLIC_FEED_ARTICLE: 60 * 3, // 3 mins
  PUBLIC_FEED_TAG: 60 * 3, // 3 mins
  PUBLIC_FEED_USER: 60 * 30, // 30 mins
  PUBLIC_SEARCH: 60 * 60 * 1, // 1 hour

  PRIVATE_QUERY: 60 * 3, // 3 mins

  STATIC: 60 * 60 * 24 * 10, // 10 days for static data
  LONG: 60 * 60 * 24, // 1 day
  SHORT: 60 * 3, // 3 mins
  INSTANT: 0, // no cache
}

// keyword notating for cache invalidation
export const CACHE_KEYWORD = '__invalid_nodes__'

// redis cache for apq keys or resolver returned objects
export const CACHE_PREFIX = {
  OBJECTS: 'cache-objects',
  OPERATION_LOG: 'operation-log',
}
