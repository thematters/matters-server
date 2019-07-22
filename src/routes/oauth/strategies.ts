import passport from 'passport'
import {
  Strategy,
  VerifyCallback,
  StrategyOptions,
  VerifyFunction
} from 'passport-oauth2'
import { environment } from 'common/environment'

class LikeCoinStrategy extends Strategy {
  constructor(options: StrategyOptions, verify: VerifyFunction) {
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
        callbackURL: environment.likecoinCallbackURL
      },
      (
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: VerifyCallback
      ) => {
        // TODOs
        console.log(accessToken, refreshToken, profile)
        done(null)
      }
    )
  )
}
