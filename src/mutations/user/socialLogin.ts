import type { GQLMutationResolvers } from 'definitions'

import { AUTH_RESULT_TYPE } from 'common/enums'
import { UserInputError } from 'common/errors'
import { setCookie } from 'common/utils'

export const socialLogin: GQLMutationResolvers['socialLogin'] = async (
  _,
  { input: { type, authorizationCode, codeVerifier } },
  { dataSources: { userService }, req, res }
) => {
  if (type === 'Twitter') {
    if (codeVerifier === undefined) {
      throw new UserInputError('codeVerifier is required')
    }
    const userInfo = await userService.fetchTwitterUserInfo(
      authorizationCode,
      codeVerifier
    )
    console.log(userInfo)
  }
  const user = await userService.loadById('1')
  const sessionToken = await userService.genSessionToken(user.id)
  setCookie({ req, res, token: sessionToken, user })

  return {
    token: sessionToken,
    auth: true,
    type: AUTH_RESULT_TYPE.Login,
    user,
  }
}

export const addSocialLogin: GQLMutationResolvers['addSocialLogin'] = async (
  _,
  __,
  { dataSources: { userService }, viewer }
) => {
  return userService.loadById(viewer.id)
}

export const removeSocialLogin: GQLMutationResolvers['removeSocialLogin'] =
  async (_, __, { dataSources: { userService }, viewer }) => {
    return userService.loadById(viewer.id)
  }
