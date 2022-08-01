import { CorsOptions } from 'cors'

import { isProd } from 'common/environment'

export const CORS_OPTIONS: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, false)
    }

    const isLocalDev = /(localhost|127\.0\.0\.1):\d+$/.test(origin)
    const isMatters =
      /\/\/(.*\.)?matters\.news$/.test(origin) ||
      /\/\/(.*\.)?mattersprotocol\.io$/.test(origin)
    const isApolloStudio = /\/\/(.*\.)?apollographql\.com$/.test(origin)
    const isDevPreview =
      !isProd &&
      (/\.vercel\.app$/.test(origin) || /githubpreview\.dev$/.test(origin))
    const isAllowed = isLocalDev || isMatters || isApolloStudio || isDevPreview

    callback(null, isAllowed)
  },
  credentials: true,
}
