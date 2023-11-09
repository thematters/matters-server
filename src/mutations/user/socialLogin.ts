import type { GQLMutationResolvers, AuthMode } from 'definitions'

import { AUTH_RESULT_TYPE, SOCIAL_LOGIN_TYPE } from 'common/enums'
import { UserInputError } from 'common/errors'
import { setCookie, getViewerFromUser } from 'common/utils'
import { checkIfE2ETest, throwOrReturnUserInfo } from 'common/utils/e2e'

export const socialLogin: GQLMutationResolvers['socialLogin'] = async (
  _,
  {
    input: {
      type,
      authorizationCode,
      codeVerifier,
      nonce,
      oauth1Credential,
      language,
      referralCode,
    },
  },
  context
) => {
  const {
    dataSources: { userService },
    req,
    res,
    viewer,
  } = context

  const isE2ETest = checkIfE2ETest(authorizationCode ?? '')

  let user
  if (type === SOCIAL_LOGIN_TYPE.Twitter) {
    let userInfo: {
      id: string
      username: string
    }
    if (codeVerifier === undefined || authorizationCode === undefined) {
      if (oauth1Credential) {
        const { oauthToken, oauthVerifier } = oauth1Credential
        userInfo = (await userService.fetchTwitterUserInfoOauth1(
          oauthToken,
          oauthVerifier
        )) as any
      } else {
        throw new UserInputError('oauth1Credential are required')
      }
    } else {
      if (isE2ETest) {
        userInfo = throwOrReturnUserInfo(authorizationCode, type) as any
      } else {
        userInfo = await userService.fetchTwitterUserInfo(
          authorizationCode,
          codeVerifier
        )
      }
    }
    user = await userService.getOrCreateUserBySocialAccount({
      providerAccountId: userInfo.id,
      type: SOCIAL_LOGIN_TYPE.Twitter,
      userName: userInfo.username,
      language: language || viewer.language,
      referralCode,
    })
  } else if (type === SOCIAL_LOGIN_TYPE.Facebook) {
    if (codeVerifier === undefined || authorizationCode === undefined) {
      throw new UserInputError(
        'codeVerifier and authorizationCode are both required'
      )
    }
    let userInfo: {
      id: string
      username: string
    }
    if (isE2ETest) {
      userInfo = throwOrReturnUserInfo(authorizationCode, type) as any
    } else {
      userInfo = await userService.fetchFacebookUserInfo(
        authorizationCode,
        codeVerifier
      )
    }
    user = await userService.getOrCreateUserBySocialAccount({
      providerAccountId: userInfo.id,
      type: SOCIAL_LOGIN_TYPE.Facebook,
      userName: userInfo.username,
      language: language || viewer.language,
      referralCode,
    })
  } else {
    if (nonce === undefined || authorizationCode === undefined) {
      throw new UserInputError('nonce and authorizationCode is required')
    }
    let userInfo: {
      id: string
      email: string
      emailVerified: boolean
    }
    if (isE2ETest) {
      userInfo = throwOrReturnUserInfo(authorizationCode, type) as any
    } else {
      userInfo = await userService.fetchGoogleUserInfo(authorizationCode, nonce)
    }
    user = await userService.getOrCreateUserBySocialAccount({
      providerAccountId: userInfo.id,
      type: SOCIAL_LOGIN_TYPE.Google,
      email: userInfo.email,
      emailVerified: userInfo.emailVerified,
      language: language || viewer.language,
      referralCode,
    })
  }
  const sessionToken = await userService.genSessionToken(user.id)
  setCookie({ req, res, token: sessionToken, user })

  context.viewer = await getViewerFromUser(user)
  context.viewer.authMode = user.role as AuthMode
  context.viewer.scope = {}

  return {
    token: sessionToken,
    auth: true,
    type: AUTH_RESULT_TYPE.Login,
    user,
  }
}

export const addSocialLogin: GQLMutationResolvers['addSocialLogin'] = async (
  _,
  {
    input: {
      type,
      authorizationCode,
      codeVerifier,
      oauth1Credential,
      nonce,
      referralCode,
    },
  },
  { dataSources: { userService }, viewer }
) => {
  const isE2ETest = checkIfE2ETest(authorizationCode ?? '')

  if (type === SOCIAL_LOGIN_TYPE.Twitter) {
    let userInfo: {
      id: string
      username: string
    }
    if (codeVerifier === undefined || authorizationCode === undefined) {
      if (oauth1Credential) {
        const { oauthToken, oauthVerifier } = oauth1Credential
        userInfo = await userService.fetchTwitterUserInfoOauth1(
          oauthToken,
          oauthVerifier
        )
      } else {
        throw new UserInputError(
          'codeVerifier and authorizationCode are both required'
        )
      }
    } else {
      if (isE2ETest) {
        userInfo = throwOrReturnUserInfo(authorizationCode, type) as any
      } else {
        userInfo = await userService.fetchTwitterUserInfo(
          authorizationCode,
          codeVerifier
        )
      }
    }
    await userService.createSocialAccount({
      userId: viewer.id,
      providerAccountId: userInfo.id,
      type: SOCIAL_LOGIN_TYPE.Twitter,
      userName: userInfo.username,
    })
  } else if (type === SOCIAL_LOGIN_TYPE.Facebook) {
    if (codeVerifier === undefined || authorizationCode === undefined) {
      throw new UserInputError(
        'codeVerifier and authorizationCode are both required'
      )
    }
    let userInfo: {
      id: string
      username: string
    }
    if (isE2ETest) {
      userInfo = throwOrReturnUserInfo(authorizationCode, type) as any
    } else {
      userInfo = await userService.fetchFacebookUserInfo(
        authorizationCode,
        codeVerifier
      )
    }
    await userService.createSocialAccount({
      userId: viewer.id,
      providerAccountId: userInfo.id,
      type: SOCIAL_LOGIN_TYPE.Facebook,
      userName: userInfo.username,
    })
  } else {
    // Google
    if (nonce === undefined || authorizationCode === undefined) {
      throw new UserInputError('nonce and authorizationCode is required')
    }
    let userInfo: {
      id: string
      email: string
      emailVerified: boolean
    }
    if (isE2ETest) {
      userInfo = throwOrReturnUserInfo(authorizationCode, type) as any
    } else {
      userInfo = await userService.fetchGoogleUserInfo(authorizationCode, nonce)
    }
    await userService.createSocialAccount({
      userId: viewer.id,
      providerAccountId: userInfo.id,
      type: SOCIAL_LOGIN_TYPE.Google,
      email: userInfo.email,
    })
    if (viewer.email === null) {
      const user = await userService.findByEmail(userInfo.email)
      if (!user) {
        return await userService.baseUpdate(viewer.id, {
          email: userInfo.email,
          emailVerified: userInfo.emailVerified,
        })
      }
    } else if (
      viewer.email === userInfo.email &&
      !viewer.emailVerified &&
      userInfo.emailVerified
    ) {
      return await userService.baseUpdate(viewer.id, {
        emailVerified: userInfo.emailVerified,
      })
    }
  }

  return viewer
}

export const removeSocialLogin: GQLMutationResolvers['removeSocialLogin'] =
  async (_, { input: { type } }, { dataSources: { userService }, viewer }) => {
    await userService.removeSocialAccount(viewer.id, type)
    return viewer
  }
