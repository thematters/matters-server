import { invalidateFQC } from '@matters/apollo-response-cache'
import LikeCoinStrategy from '@matters/passport-likecoin'
import { get } from 'lodash'
import passport from 'passport'

import { NODE_TYPES, OAUTH_CALLBACK_ERROR_CODE } from 'common/enums'
import { environment } from 'common/environment'
import { getLogger } from 'common/logger'
import { UserService } from 'connectors'

import { connections } from '../connections'

const logger = getLogger('route-auth')

export default () => {
  passport.use(
    new LikeCoinStrategy(
      {
        authorizationURL: environment.likecoinAuthorizationURL,
        tokenURL: environment.likecoinTokenURL,
        clientID: environment.likecoinClientId,
        clientSecret: environment.likecoinClientSecret,
        callbackURL: environment.likecoinCallbackURL,
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, params, _, done) => {
        const userService = new UserService(connections)
        const viewer = req.app.locals.viewer
        const userId = get(viewer, 'id')
        const likerId = get(params, 'user')

        if (!userId) {
          return done(null, undefined, {
            code: OAUTH_CALLBACK_ERROR_CODE.userNotFound,
            message: 'viewer not found.',
          })
        }

        if (!likerId) {
          return done(null, undefined, {
            code: OAUTH_CALLBACK_ERROR_CODE.likerNotFound,
            message: 'liker not found.',
          })
        }

        try {
          // check if likerId is already exists
          const liker = await userService.findLiker({
            likerId,
          })

          if (liker && liker.likerId !== viewer.likerId) {
            return done(null, undefined, {
              code: OAUTH_CALLBACK_ERROR_CODE.likerExists,
              message: 'liker already exists.',
            })
          }

          if (viewer.likerId) {
            const fromLiker = await userService.findLiker({
              likerId: viewer.likerId,
            })

            // forbid to change current liker id
            if (fromLiker?.accountType === 'general') {
              return done(null, undefined, {
                code: OAUTH_CALLBACK_ERROR_CODE.likerExists,
                message: 'liker already exists.',
              })
            }

            // transfer viewer's temporary LikerID to his own LikerID
            if (
              fromLiker &&
              fromLiker.accountType === 'temporal' &&
              fromLiker.likerId !== likerId
            ) {
              const newFromLikerAccessToken =
                await userService.likecoin.refreshToken({ liker: fromLiker })
              await userService.transferLikerId({
                fromLiker: {
                  ...fromLiker,
                  accessToken: newFromLikerAccessToken,
                },
                toLiker: {
                  likerId,
                  accessToken,
                },
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
            accountType: 'general',
          })

          const user = await userService.dataloader.load(viewer.id)

          // invalidate user cache
          await invalidateFQC({
            node: { type: NODE_TYPES.User, id: userId },
            redis: connections.redis,
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
