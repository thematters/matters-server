import passport from 'passport'
import _ from 'lodash'
import {
  Strategy,
  StrategyOptionsWithRequest,
  VerifyFunctionWithRequest
} from 'passport-oauth2'

import { environment } from 'common/environment'
import { UserService } from 'connectors'

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
        const likerId = _.get(params, 'user')
        const userService = new UserService()
        const userId = _.get(req.app.locals.viewer, 'id')

        // TODO: check likerId already bound with another user
        // TODO: check is user exists

        // if (!likerId) {
        //   return done(null, false, { message: "likerId isn's exists" })
        // }

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
          return done(e)
        }
      }
    )
  )
}
