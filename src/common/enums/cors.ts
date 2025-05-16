import { isProd } from '#common/environment.js'
import { CorsOptions } from 'cors'

export const CORS_OPTIONS: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, false)
    }

    const isLocalDev = /(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    const isMatters = /\/\/(.*\.)?matters\.(town|news|icu)$/.test(origin)
    const isApolloStudio = /\/\/(.*\.)?apollographql\.com$/.test(origin)
    const isObservable =
      'https://matters-tech.static.observableusercontent.com' === origin
    const isDevPreview =
      !isProd &&
      (/\.vercel\.app$/.test(origin) || /githubpreview\.dev$/.test(origin))
    const isAllowed =
      isLocalDev || isMatters || isApolloStudio || isObservable || isDevPreview

    callback(null, isAllowed)
  },
  credentials: true,
}
