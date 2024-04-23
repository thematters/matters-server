import type {
  Falsey,
  OAuthAuthorizationCode,
  OAuthAuthorizationCodeDB,
  OAuthClient,
  OAuthClientDB,
  OAuthAccessTokenDB,
  OAuthRefreshTokenDB,
  OAuthRefreshToken,
  OAuthToken,
  User,
  Connections,
} from 'definitions'

import jwt from 'jsonwebtoken'
import { nanoid } from 'nanoid'

import {
  NODE_TYPES,
  OAUTH_ACCESS_TOKEN_EXPIRES_IN_MS,
  OAUTH_REFRESH_TOKEN_EXPIRES_IN_MS,
} from 'common/enums'
import { environment } from 'common/environment'
import { getLogger } from 'common/logger'
import { isScopeAllowed, toGlobalId } from 'common/utils'
import { BaseService } from 'connectors'

const logger = getLogger('service-oauth')

export class OAuthService extends BaseService<OAuthClientDB> {
  public constructor(connections: Connections) {
    super('oauth_client', connections)
  }

  /*********************************
   *                               *
   *             Client            *
   *                               *
   *********************************/
  public findClient = async ({ clientId }: { clientId: string }) =>
    this.knex('oauth_client').select().where({ clientId }).first()

  public findClientByName = async ({ name }: { name: string }) =>
    this.knex('oauth_client').select().where({ name }).first()

  public updateOrCreateClient = async (params: {
    clientId: string
    clientSecret?: string
    name?: string
    description?: string
    websiteUrl?: string
    scope?: string[]
    avatar?: string
    redirectURIs?: string[]
    grantTypes?: string[]
    userId: string
  }) =>
    this.baseUpdateOrCreate({
      where: { clientId: params.clientId },
      data: params,
      table: 'oauth_client',
    })

  public getClient = async (
    clientId: string,
    clientSecret?: string
  ): Promise<OAuthClient | Falsey> => {
    const client = await this.knex('oauth_client')
      .select()
      .where({ clientId, ...(clientSecret ? { clientSecret } : {}) })
      .first()

    return this.toOAuthClient(client)
  }

  private toOAuthClient = (dbClient: OAuthClientDB): OAuthClient | Falsey => {
    if (!dbClient) {
      return
    }

    return {
      id: dbClient.id,
      redirectUris: dbClient.redirectUri,
      grants: dbClient.grantTypes,
      scope: dbClient.scope,
      rawClient: dbClient,
      // accessTokenLifetime: , // Client-specific lifetime
      // refreshTokenLifetime: , // Client-specific lifetime
    }
  }

  private getClientById = async (id: string) => {
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
  public generateAccessToken = async (
    client: OAuthClient,
    user: User,
    scope: string | string[]
  ): Promise<string> => nanoid(40)

  public getAccessToken = async (
    accessToken: string
  ): Promise<OAuthToken | Falsey> => {
    const token = await this.knex('oauth_access_token')
      .select()
      .where({ token: accessToken })
      .first()

    if (!token) {
      return
    }

    const client = (await this.getClientById(token.clientId)) as OAuthClient
    const user = await this.models.userIdLoader.load(token.userId)

    return {
      accessToken: token.token,
      accessTokenExpiresAt: new Date(token.expires),
      scope: token.scope,
      client,
      user,
    }
  }

  public saveToken = async (
    token: OAuthToken,
    client: OAuthClient,
    user: User
  ): Promise<OAuthToken> => {
    const scope = token.scope instanceof Array ? token.scope : [token.scope]

    const accessToken = await this.baseCreate<OAuthAccessTokenDB>(
      {
        token: token.accessToken,
        expires: token.accessTokenExpiresAt,
        clientId: client.id,
        userId: user.id,
        scope,
      },
      'oauth_access_token'
    )
    const refreshToken = await this.baseCreate<OAuthRefreshTokenDB>(
      {
        token: token.refreshToken,
        expires: token.refreshTokenExpiresAt,
        clientId: client.id,
        userId: user.id,
        scope,
      },
      'oauth_refresh_token'
    )

    const payload = {
      sub: toGlobalId({ type: NODE_TYPES.User, id: user.id }),
      name: user.userName,
      email: user.email,
      emailVerified: user.emailVerified,
    }

    const id_token = jwt.sign(payload, environment.OICDPrivateKey, {
      expiresIn: OAUTH_ACCESS_TOKEN_EXPIRES_IN_MS / 1000,
      issuer: 'matters.news',
      algorithm: 'RS256',
    })

    return {
      accessToken: accessToken.token,
      accessTokenExpiresAt: new Date(accessToken.expires),
      refreshToken: refreshToken.token,
      refreshTokenExpiresAt: new Date(refreshToken.expires),
      scope: accessToken.scope,
      id_token,
      client,
      user,
    }
  }

  /*********************************
   *                               *
   *       Authorization Code      *
   *                               *
   *********************************/
  public getAuthorizationCode = async (
    authorizationCode: string
  ): Promise<OAuthAuthorizationCode | Falsey> => {
    const code = await this.knex('oauth_authorization_code')
      .select()
      .where({ code: authorizationCode })
      .first()
    const client = (await this.getClientById(code.clientId)) as OAuthClient
    const user = await this.models.userIdLoader.load(code.userId)

    if (!code) {
      return
    }

    return {
      authorizationCode: code.code,
      expiresAt: new Date(code.expires),
      redirectUri: code.redirectUri,
      scope: code.scope,
      client,
      user,
    }
  }

  public saveAuthorizationCode = async (
    code: OAuthAuthorizationCode,
    client: OAuthClient,
    user: User
  ): Promise<OAuthAuthorizationCode | Falsey> => {
    const authorizationCode = await this.baseCreate<OAuthAuthorizationCodeDB>(
      {
        code: code.authorizationCode,
        expires: code.expiresAt,
        redirectUri: code.redirectUri,
        scope:
          code.scope instanceof Array ? code.scope : [code.scope as string],
        clientId: client.id,
        userId: user.id,
      },
      'oauth_authorization_code'
    )

    if (!authorizationCode) {
      return
    }

    return {
      authorizationCode: authorizationCode.code,
      expiresAt: new Date(authorizationCode.expires),
      redirectUri: authorizationCode.redirectUri,
      scope: authorizationCode.scope,
      client,
      user,
    }
  }

  public revokeAuthorizationCode = async (code: OAuthAuthorizationCode) => {
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
  public generateRefreshToken = async (
    client: OAuthClient,
    user: User,
    scope: string | string[]
  ): Promise<string> => nanoid(40)

  public getRefreshToken = async (
    refreshToken: string
  ): Promise<OAuthRefreshToken | Falsey> => {
    const token = await this.knex('oauth_refresh_token')
      .select()
      .where({ token: refreshToken })
      .first()
    const client = (await this.getClientById(token.clientId)) as OAuthClient
    const user = await this.models.userIdLoader.load(token.userId)

    if (!token) {
      return
    }

    return {
      refreshToken: token.token,
      refreshTokenExpiresAt: new Date(token.expires),
      scope: token.scope,
      client,
      user,
    }
  }

  public revokeToken = async (token: OAuthRefreshToken) => {
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
  private scopeStr2Arr = (scope: string): string[] =>
    // split by a space or a comma
    scope.split(/[,\s]/).filter((s) => !!s)

  public validateScope = async (
    user: User,
    client: OAuthClient,
    scope: string | string[]
  ): Promise<string | string[] | Falsey> => {
    if (!client.scope) {
      return false
    }

    // Use client's default scope,
    // if thrid-party app has not specified "scope" query parameter in authorization,
    if (!scope) {
      return client.scope
    }

    // check with db
    const clientScope = client.scope as string[]
    const scopes = scope instanceof Array ? scope : this.scopeStr2Arr(scope)
    let isValidate = true

    for (const requestScope of scopes) {
      if (!isScopeAllowed(clientScope, requestScope)) {
        isValidate = false
        break
      }
    }

    if (!isValidate) {
      return false
    }

    return scopes
  }

  public verifyScope = async (
    accessToken: OAuthToken,
    scope: string | string[]
  ) =>
    // TODO: Maybe we don't have to implement this?
    true

  /*********************************
   *                               *
   *           LikeCoin            *
   *                               *
   *********************************/
  public generateTokenForLikeCoin = async ({ userId }: { userId: string }) => {
    const user = await this.models.userIdLoader.load(userId)
    const name = environment.likecoinOAuthClientName
    const client = await this.findClientByName({ name })
    const oauthClient = this.toOAuthClient(client)

    if (!client || !oauthClient) {
      throw new Error(`client of "${name}" does not exists`)
    }

    // generate access token
    const accessToken = await this.generateAccessToken(
      oauthClient,
      user,
      client.scope
    )

    // generate refresh token
    const refreshToken = await this.generateRefreshToken(
      oauthClient,
      user,
      client.scope
    )

    // save token
    return this.saveToken(
      {
        accessToken,
        accessTokenExpiresAt: new Date(
          Date.now() + OAUTH_ACCESS_TOKEN_EXPIRES_IN_MS
        ),
        refreshToken,
        refreshTokenExpiresAt: new Date(
          Date.now() + OAUTH_REFRESH_TOKEN_EXPIRES_IN_MS
        ),
        scope: client.scope,
        client,
        user,
      },
      client,
      user
    )
  }
}
