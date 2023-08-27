import type { GQLMutationResolvers, AuthMode } from 'definitions'

import { AUTH_RESULT_TYPE, SOCIAL_LOGIN_TYPE } from 'common/enums'
import { UserInputError } from 'common/errors'
import { setCookie, getViewerFromUser } from 'common/utils'

export const socialLogin: GQLMutationResolvers['socialLogin'] = async (
  _,
  { input: { type, authorizationCode, codeVerifier, nonce } },
  context
) => {
  const {
    dataSources: { userService },
    req,
    res,
  } = context

  let user
  if (type === SOCIAL_LOGIN_TYPE.Twitter) {
    if (codeVerifier === undefined) {
      throw new UserInputError('codeVerifier is required')
    }
    const userInfo = await userService.fetchTwitterUserInfo(
      authorizationCode,
      codeVerifier
    )
    user = await userService.getOrCreateUserBySocialAccount({
      providerAccountId: userInfo.id,
      type: SOCIAL_LOGIN_TYPE.Twitter,
      userName: userInfo.username,
    })
  } else if (type === SOCIAL_LOGIN_TYPE.Facebook) {
    if (codeVerifier === undefined) {
      throw new UserInputError('codeVerifier is required')
    }
    const userInfo = await userService.fetchFacebookUserInfo(
      authorizationCode,
      codeVerifier
    )
    user = await userService.getOrCreateUserBySocialAccount({
      providerAccountId: userInfo.id,
      type: SOCIAL_LOGIN_TYPE.Facebook,
      userName: userInfo.username,
    })
  } else {
    if (nonce === undefined) {
      throw new UserInputError('nonce is required')
    }
    const userInfo = await userService.fetchGoogleUserInfo(
      authorizationCode,
      nonce
    )
    user = await userService.getOrCreateUserBySocialAccount({
      providerAccountId: userInfo.id,
      type: SOCIAL_LOGIN_TYPE.Google,
      email: userInfo.email,
      emailVerified: userInfo.emailVerified,
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
  { input: { type, authorizationCode, codeVerifier, nonce } },
  { dataSources: { userService }, viewer }
) => {
  if (type === SOCIAL_LOGIN_TYPE.Twitter) {
    if (codeVerifier === undefined) {
      throw new UserInputError('codeVerifier is required')
    }
    const userInfo = await userService.fetchTwitterUserInfo(
      authorizationCode,
      codeVerifier
    )
    await userService.createSocialAccount({
      userId: viewer.id,
      providerAccountId: userInfo.id,
      type: SOCIAL_LOGIN_TYPE.Twitter,
      userName: userInfo.username,
    })
  } else if (type === SOCIAL_LOGIN_TYPE.Facebook) {
    if (codeVerifier === undefined) {
      throw new UserInputError('codeVerifier is required')
    }
    const userInfo = await userService.fetchFacebookUserInfo(
      authorizationCode,
      codeVerifier
    )
    await userService.createSocialAccount({
      userId: viewer.id,
      providerAccountId: userInfo.id,
      type: SOCIAL_LOGIN_TYPE.Facebook,
      userName: userInfo.username,
    })
  } else {
    if (nonce === undefined) {
      throw new UserInputError('nonce is required')
    }
    const userInfo = await userService.fetchGoogleUserInfo(
      authorizationCode,
      nonce
    )
    // TODO: handle user email
    await userService.createSocialAccount({
      userId: viewer.id,
      providerAccountId: userInfo.id,
      type: SOCIAL_LOGIN_TYPE.Google,
      email: userInfo.email,
    })
  }
  return viewer
}

export const removeSocialLogin: GQLMutationResolvers['removeSocialLogin'] =
  async (_, __, { dataSources: { userService }, viewer }) => {
    return userService.loadById(viewer.id)
  }
