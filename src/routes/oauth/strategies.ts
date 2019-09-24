import passport from 'passport'
import _ from 'lodash'
import {
  Strategy,
  StrategyOptionsWithRequest,
  VerifyFunctionWithRequest
} from 'passport-oauth2'

import { environment } from 'common/environment'
import { userService } from 'connectors'
import { OAUTH_CALLBACK_ERROR_CODE } from 'common/enums'
import logger from 'common/logger'

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

          if (liker) {
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

            if (fromLiker && fromLiker.accountType === 'temporal') {
              await userService.transferLikerId({
                fromLiker,
                toLiker: {
                  likerId,
                  accessToken
                }
              })
            }
          }

          // save authorized liker and remove the existing temporary one
          const user = await userService.saveLiker({
            userId,
            likerId,
            accessToken,
            refreshToken,
            accountType: 'general'
          })

          return done(null, user)
        } catch (e) {
          logger.error(e)
          return done(null, undefined)
        }
      }
    )
  )
}
