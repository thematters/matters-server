import jwt from 'jsonwebtoken'

import {
  OAuthClient,
  User,
  OAuthToken,
  OAuthAuthorizationCode,
  OAuthRefreshToken,
  Falsey
} from 'definitions'
import logger from 'common/logger'
import { environment } from 'common/environment'
import { OAUTH_ACCESS_TOKEN_EXPIRES_IN, OAUTH_VALID_SCOPES } from 'common/enums'
import { randomString } from 'common/utils'

import { BaseService } from './baseService'
import { UserService } from './userService'

export class OAuthService extends BaseService {
  constructor() {
    super('noop')
  }

  /*********************************
   *                               *
   *             Client            *
   *                               *
   *********************************/
  getClient = async (
    clientId: string,
    clientSecret: string
  ): Promise<OAuthClient | Falsey> => {
    const client = await this.knex('oauth_client')
      .select()
      .where({ clientId, ...(clientSecret ? { clientSecret } : {}) })
      .first()

    return this.toOAuthClient(client)
  }

  toOAuthClient = (dbClient: any) => {
    if (!dbClient) {
      return
    }

    return {
      id: dbClient.id,
      redirectUris: [dbClient.redirectUri],
      grants: dbClient.grantTypes.split(' ')
      // accessTokenLifetime: , // Client-specific lifetime
      // refreshTokenLifetime: , // Client-specific lifetime
    }
  }

  getClientById = async (id: string) => {
    const client = await this.knex('oauth_client')
      .select()
      .where({ id })
      .first()

    return this.toOAuthClient(client)
  }

  /*********************************
   *                               *
   *          Access Token         *
   *                               *
   *********************************/
  generateAccessToken = async (
    client: OAuthClient,
    user: User,
    scope: string
  ): Promise<string> => {
    const token = jwt.sign(
      { uuid: user.uuid, scope, client_id: client.id, type: 'oauth' },
      environment.oAuthSecret,
      {
        expiresIn: OAUTH_ACCESS_TOKEN_EXPIRES_IN
      }
    )
    return token
  }

  getAccessToken = async (
    accessToken: string
  ): Promise<OAuthToken | Falsey> => {
    const token = await this.knex('oauth_access_token')
      .select()
      .where({ token: accessToken })
      .first()
    const client = (await this.getClientById(token.clientId)) as OAuthClient
    const userService = new UserService()
    const user = (await userService.dataloader.load(token.userId)) as User

    if (!token) {
      return
    }

    return {
      accessToken: token.token,
      accessTokenExpiresAt: new Date(token.expires),
      scope: token.scope,
      client,
      user
    }
  }

  saveToken = async (
    token: OAuthToken,
    client: OAuthClient,
    user: User
  ): Promise<OAuthToken> => {
    const scope =
      token.scope instanceof Array ? token.scope.join(' ') : token.scope

    const accessToken = await this.baseCreate(
      {
        token: token.accessToken,
        expires: token.accessTokenExpiresAt,
        clientId: client.id,
        userId: user.id,
        scope
      },
      'oauth_access_token'
    )
    const refreshToken = await this.baseCreate(
      {
        token: token.refreshToken,
        expires: token.refreshTokenExpiresAt,
        clientId: client.id,
        userId: user.id,
        scope
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

  /*********************************
   *                               *
   *       Authorization Code      *
   *                               *
   *********************************/
  getAuthorizationCode = async (
    authorizationCode: string
  ): Promise<OAuthAuthorizationCode | Falsey> => {
    const code = await this.knex('oauth_authorization_code')
      .select()
      .where({ code: authorizationCode })
      .first()
    const client = (await this.getClientById(code.clientId)) as OAuthClient
    const userService = new UserService()
    const user = (await userService.dataloader.load(code.userId)) as User

    if (!code) {
      return
    }

    return {
      authorizationCode: code.code,
      expiresAt: new Date(code.expires),
      redirectUri: code.redirectUri,
      scope: code.scope,
      client,
      user
    }
  }

  saveAuthorizationCode = async (
    code: OAuthAuthorizationCode,
    client: OAuthClient,
    user: User
  ): Promise<OAuthAuthorizationCode | Falsey> => {
    const authorizationCode = await this.baseCreate(
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

    if (!authorizationCode) {
      return
    }

    return {
      authorizationCode: authorizationCode.code,
      expiresAt: new Date(authorizationCode.exipres),
      redirectUri: authorizationCode.redirectUri,
      scope: authorizationCode.scope,
      client,
      user
    }
  }

  revokeAuthorizationCode = async (
    code: OAuthAuthorizationCode
  ): Promise<boolean> => {
    try {
      await this.knex('oauth_authorization_code')
        .select()
        .where({ code: code.authorizationCode, userId: code.user.id })
        .del()
      return true
    } catch (e) {
      logger.error(e)
      return false
    }
  }

  /*********************************
   *                               *
   *         Refresh Token         *
   *                               *
   *********************************/
  generateRefreshToken = async (
    client: OAuthClient,
    user: User,
    scope: string
  ): Promise<string> => {
    const token = randomString(40)
    return token
  }

  getRefreshToken = async (
    refreshToken: string
  ): Promise<OAuthRefreshToken | Falsey> => {
    const token = await this.knex('oauth_refresh_token')
      .select()
      .where({ token: refreshToken })
      .first()
    const client = (await this.getClientById(token.clientId)) as OAuthClient
    const userService = new UserService()
    const user = (await userService.dataloader.load(token.userId)) as User

    if (!token) {
      return
    }

    return {
      refreshToken: token.token,
      refreshTokenExpiresAt: new Date(token.expires),
      scope: token.scope,
      client,
      user
    }
  }

  revokeToken = async (token: OAuthRefreshToken): Promise<boolean> => {
    try {
      await this.knex('oauth_refresh_token')
        .select()
        .where({ token: token.refreshToken, userId: token.user.id })
        .del()
      return true
    } catch (e) {
      logger.error(e)
      return false
    }
  }

  /*********************************
   *                               *
   *             Scope             *
   *                               *
   *********************************/
  validateScope = async (
    user: User,
    client: OAuthClient,
    scope: string
  ): Promise<string | string[] | Falsey> => {
    return scope
      .split(' ')
      .filter(s => OAUTH_VALID_SCOPES.indexOf(s) >= 0)
      .join(' ')
  }

  verifyScope = async (
    accessToken: OAuthToken,
    scope: string
  ): Promise<boolean> => {
    //TODO
    return true
  }
}
