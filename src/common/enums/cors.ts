import { CorsOptions } from 'cors'

export const CORS_OPTIONS: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, false)
    }

    const isLocalDev =
      /(localhost|127\.0\.0\.1):\d+$/.test(origin) ||
      /githubpreview\.dev$/.test(origin)
    const isMatters = /\/\/(.*\.)?matters\.news$/.test(origin)
    const isApolloStudio = /\/\/(.*\.)?apollographql\.com$/.test(origin)
    const isAllowed = isLocalDev || isMatters || isApolloStudio

    callback(null, isAllowed)
  },
  credentials: true,
}
