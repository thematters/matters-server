import jwt from 'jsonwebtoken'

import {
  OAuthClient,
  User,
  OAuthToken,
  OAuthAuthorizationCode
} from 'definitions'
import logger from 'common/logger'
import { environment } from 'common/environment'
import { randomString } from 'common/utils'
import {
  OAUTH_ACCESS_TOKEN_EXPIRES_IN,
  OAUTH_AUTHORIZATION_TOKEN_EXPIRES_IN,
  OAUTH_REFRESH_TOKEN_EXPIRES_IN
} from 'common/enums'

import { BaseService } from './baseService'
import { UserService } from './userService'

export class OAuthService extends BaseService {
  constructor() {
    super('noop')
  }

  /*********************************
   *                               *
   *      Authorization Code       *
   *                               *
   *********************************/
  generateAccessToken = async (
    client: OAuthClient,
    user: User,
    scope: string
  ): Promise<string> => {
    console.log('generateAccessToken')

    const token = jwt.sign(
      { uuid: user.uuid, scope },
      environment.oAuthSecret,
      {
        expiresIn: OAUTH_ACCESS_TOKEN_EXPIRES_IN
      }
    )
    return token
  }

  generateRefreshToken = async (
    client: OAuthClient,
    user: User,
    scope: string
  ): Promise<string> => {
    console.log('generateRefreshToken')

    const token = jwt.sign(
      { uuid: user.uuid, scope },
      environment.oAuthSecret,
      {
        expiresIn: OAUTH_REFRESH_TOKEN_EXPIRES_IN
      }
    )
    return token
  }

  getAuthorizationCode = async (authorizationCode: string) => {
    console.log('getAuthorizationCode')

    const code = await this.knex('oauth_authorization_code')
      .select()
      .where({ code: authorizationCode })
      .first()
    const client = await this.getClientById(code.clientId)
    const userService = new UserService()
    const user = await userService.dataloader.load(code.userId)

    return {
      authorizationCode: code.code,
      expiresAt: new Date(code.expires),
      redirectUri: code.redirectUri,
      client,
      user
    }
  }

  getClient = async (
    clientId: string,
    clientSecret: string
  ): Promise<OAuthClient> => {
    console.log('getClient')

    const client = await this.knex('oauth_client')
      .select()
      .where({ clientId, ...(clientSecret ? { clientSecret } : {}) })
      .first()

    return {
      id: client.id,
      redirectUris: [client.redirectUri],
      grants: client.grantTypes.split(' ')
      // accessTokenLifetime: ,
      // refreshTokenLifetime: ,
    }
  }

  getClientById = async (id: string): Promise<OAuthClient> => {
    console.log('getClientById')

    const client = await this.knex('oauth_client')
      .select()
      .where({ id })
      .first()
    return {
      id: client.id,
      // redirectUris: [],
      grants: client.grantTypes.split(' ')
      // accessTokenLifetime: ,
      // refreshTokenLifetime: ,
    }
  }

  saveToken = async (
    token: OAuthToken,
    client: OAuthClient,
    user: User
  ): Promise<OAuthToken> => {
    console.log('savetoken')

    // access token
    const accessToken = await this.baseCreate(
      {
        token: token.accessToken,
        expires: token.accessTokenExpiresAt,
        clientId: client.id,
        userId: user.id,
        scope: token.scope
      },
      'oauth_access_token'
    )

    // refresh token
    const refreshToken = await this.baseCreate(
      {
        token: token.refreshToken,
        expires: token.refreshTokenExpiresAt,
        clientId: client.id,
        userId: user.id,
        scope: token.scope
      },
      'oauth_refresh_token'
    )

    return {
      accessToken: accessToken.token,
      accessTokenExpiresAt: new Date(accessToken.expires),
      refreshToken: refreshToken.token,
      refreshTokenExpiresAt: new Date(refreshToken.expires),
      scope: accessToken.scope,
      client,
      user
    }
  }

  saveAuthorizationCode = async (
    code: OAuthAuthorizationCode,
    client: OAuthClient,
    user: User
  ): Promise<OAuthAuthorizationCode> => {
    console.log('saveAuthorizationCode')

    const refreshToken = await this.baseCreate(
      {
        code: code.authorizationCode,
        expires: code.expiresAt,
        redirect_uri: code.redirectUri,
        scope: code.scope,
        clientId: client.id,
        userId: user.id
      },
      'oauth_authorization_code'
    )

    return {
      authorizationCode: refreshToken.code,
      expiresAt: new Date(refreshToken.exipres),
      redirectUri: refreshToken.redirectUri,
      scope: refreshToken.scope,
      client,
      user
    }
  }

  revokeAuthorizationCode = async (code: OAuthAuthorizationCode) => {
    console.log('revokeAuthorizationCode')

    try {
      await this.knex('oauth_authorization_code')
        .select()
        .where({ code: code.authorizationCode, userId: code.user.id })
        .del()
      return true
    } catch (e) {
      return false
    }
  }

  validateScope = async (user: User, client: OAuthClient, scope: string) => {
    // TODO
    console.log('validateScope')

    return []
  }

  /*********************************
   *                               *
   *         Refresh Token         *
   *                               *
   *********************************/
  getRefreshToken = async (token: string) => {
    console.log('getRefreshToken')
  }

  /*********************************
   *                               *
   *     Request Authentication    *
   *                               *
   *********************************/
  getAccessToken = async (accessToken: string) => {
    console.log('getAccessToken')

    const token = await this.knex('oauth_access_token')
      .select()
      .where({ token: accessToken })
      .first()
    const client = await this.getClientById(token.clientId)
    const userService = new UserService()
    const user = await userService.dataloader.load(token.userId)

    return {
      accessToken: token.token,
      accessTokenExpiresAt: new Date(token.expires),
      scope: token.scope,
      client: client,
      user: user
    }
  }

  verifyScope = async (accessToken: OAuthToken, scope: string) => {
    //TODO
    console.log('verifyScope')

    return true
  }
}
