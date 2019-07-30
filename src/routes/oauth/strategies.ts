import passport from 'passport'
import _ from 'lodash'
import {
  Strategy,
  StrategyOptionsWithRequest,
  VerifyFunctionWithRequest
} from 'passport-oauth2'

import { environment } from 'common/environment'
import { UserService } from 'connectors'
import { OAUTH_CALLBACK_ERROR_CODE } from 'common/enums'

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
        const userService = new UserService()
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
          const user = await userService.saveLiker({
            userId,
            likerId,
            accessToken,
            refreshToken,
            accountType: 'general'
          })
          return done(null, user)
        } catch (e) {
          console.error(e)
          return done(null, undefined)
        }
      }
    )
  )
}
