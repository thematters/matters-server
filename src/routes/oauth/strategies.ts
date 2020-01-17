import _ from 'lodash'
import passport from 'passport'
import {
  Strategy,
  StrategyOptionsWithRequest,
  VerifyFunctionWithRequest
} from 'passport-oauth2'

import {
  NODE_TYPES,
  OAUTH_CALLBACK_ERROR_CODE,
  OAUTH_PROVIDER
} from 'common/enums'
import { environment } from 'common/environment'
import logger from 'common/logger'
import { CacheService, UserService } from 'connectors'

class LikeCoinStrategy extends Strategy {
  constructor(
    options: StrategyOptionsWithRequest,
    verify: VerifyFunctionWithRequest
  ) {
    options = options || {}
    super(options, verify)
    this.name = 'likecoin'
  }
}

class MediumStrategy extends Strategy {
  constructor(
    options: StrategyOptionsWithRequest,
    verify: VerifyFunctionWithRequest
  ) {
    options = options || {}
    options.scope =
      options.scope || ['basicProfile', 'listPublications'].join(',')
    super(options, verify)
    this.name = OAUTH_PROVIDER.medium
  }
}

export default () => {
  passport.use(
    new LikeCoinStrategy(
      {
        authorizationURL: environment.likecoinAuthorizationURL,
        tokenURL: environment.likecoinTokenURL,
        clientID: environment.likecoinClientId,
        clientSecret: environment.likecoinClientSecret,
        callbackURL: environment.likecoinCallbackURL,
        passReqToCallback: true
      },
      async (req, accessToken, refreshToken, params, profile, done) => {
        const userService = new UserService()
        const cacheService = new CacheService()
        const viewer = req.app.locals.viewer
        const userId = _.get(viewer, 'id')
        const likerId = _.get(params, 'user')

        if (!userId) {
          return done(null, undefined, {
            code: OAUTH_CALLBACK_ERROR_CODE.userNotFound,
            message: 'viewer not found.'
          })
        }

        if (!likerId) {
          return done(null, undefined, {
            code: OAUTH_CALLBACK_ERROR_CODE.likerNotFound,
            message: 'liker not found.'
          })
        }

        try {
          // check if likerId is already exists
          const liker = await userService.findLiker({
            likerId
          })

          if (liker && liker.likerId !== viewer.likerId) {
            return done(null, undefined, {
              code: OAUTH_CALLBACK_ERROR_CODE.likerExists,
              message: 'liker already exists'
            })
          }

          // transfer viewer's temporary LikerID to his own LikerID
          if (viewer.likerId) {
            const fromLiker = await userService.findLiker({
              likerId: viewer.likerId
            })

            if (
              fromLiker &&
              fromLiker.accountType === 'temporal' &&
              fromLiker.likerId !== likerId
            ) {
              const newFromLikerAccessToken = await userService.likecoin.refreshToken(
                { liker: fromLiker }
              )
              await userService.transferLikerId({
                fromLiker: {
                  ...fromLiker,
                  accessToken: newFromLikerAccessToken
                },
                toLiker: {
                  likerId,
                  accessToken
                }
              })
            }
          } else {
            // notify like.co
            await userService.bindLikerId({ userId, userToken: accessToken })
          }

          // save authorized liker and remove the existing temporary one
          await userService.saveLiker({
            userId,
            likerId,
            accessToken,
            refreshToken,
            accountType: 'general'
          })

          const user = await userService.dataloader.load(viewer.id)

          // invalidate user cache
          await cacheService.invalidate(NODE_TYPES.user, userId)

          return done(null, user)
        } catch (e) {
          logger.error(e)
          return done(null, undefined)
        }
      }
    )
  )

  passport.use(
    new MediumStrategy(
      {
        authorizationURL: environment.mediumAuthorizationURL,
        tokenURL: environment.mediumTokenURL,
        clientID: environment.mediumClientId,
        clientSecret: environment.mediumClientSecret,
        callbackURL: environment.mediumCallbackURL,
        state: environment.oAuthSecret,
        passReqToCallback: true
      },
      async (req, accessToken, refreshToken, params, profile, done) => {
        try {
          const userService = new UserService()
          const cacheService = new CacheService()
          const viewer = req.app.locals.viewer
          const userId = viewer?.id

          if (!userId) {
            return done(null, undefined, {
              code: OAUTH_CALLBACK_ERROR_CODE.userNotFound,
              message: 'viewer not found.'
            })
          }
          const userOAuthProviders = await userService.findOAuthProviders({
            userId
          })
          const hasMediumOAuth = (userOAuthProviders || []).includes(
            OAUTH_PROVIDER.medium
          )

          if (!hasMediumOAuth) {
            await userService.saveOAuth({
              userId,
              provider: OAUTH_PROVIDER.medium,
              accessToken,
              refreshToken,
              expires: params.expires_at,
              scope: params.scope,
              createdAt: new Date()
            })
          }

          const user = await userService.dataloader.load(viewer.id)
          await cacheService.invalidate(NODE_TYPES.user, userId)
          return done(null, user)
        } catch (error) {
          logger.error(error)
          return done(null, undefined)
        }
      }
    )
  )
}
