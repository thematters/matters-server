import passport from 'passport'
import { Strategy, VerifyCallback } from 'passport-oauth2'
import { environment } from 'common/environment'

export default () =>
  passport.use(
    new Strategy(
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
