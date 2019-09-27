import nanoid from 'nanoid'

import {
  OAUTH_ACCESS_TOKEN_EXPIRES_IN,
  OAUTH_REFRESH_TOKEN_EXPIRES_IN
} from 'common/enums'
import { environment } from 'common/environment'
import logger from 'common/logger'
import { BaseService, UserService } from 'connectors'
import {
  Falsey,
  OAuthAuthorizationCode,
  OAuthClient,
  OAuthRefreshToken,
  OAuthToken,
  User
} from 'definitions'

export class OAuthService extends BaseService {
  constructor() {
    super('oauth_client')
  }

  /*********************************
   *                               *
   *             Client            *
   *                               *
   *********************************/
  findClient = async ({ clientId }: { clientId: string }) => {
    return await this.knex('oauth_client')
      .select()
      .where({ clientId })
      .first()
  }

  findClientByName = async ({ name }: { name: string }) => {
    return await this.knex('oauth_client')
      .select()
      .where({ name })
      .first()
  }

  updateOrCreateClient = async (params: {
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
  }) => {
    return await this.baseUpdateOrCreate({
      where: { clientId: params.clientId },
      data: {
        ...params,
        updatedAt: new Date()
      },
      table: 'oauth_client'
    })
  }

  getClient = async (
    clientId: string,
    clientSecret?: string
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
      redirectUris: dbClient.redirectUri,
      grants: dbClient.grantTypes,
      scope: dbClient.scope,
      rawClient: dbClient
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
    scope: string | string[]
  ): Promise<string> => {
    return nanoid(40)
  }

  getAccessToken = async (
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
    const userService = new UserService()
    const user = (await userService.dataloader.load(token.userId)) as User

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
    const scope = token.scope instanceof Array ? token.scope : [token.scope]

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
    scope: string | string[]
  ): Promise<string> => {
    return nanoid(40)
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
  scopeStr2Arr = (scope: string): string[] => {
    return scope.split(/[,\s]/).filter(s => !!s)
  }

  validateScope = async (
    user: User,
    client: OAuthClient,
    scope: string | string[]
  ): Promise<string | string[] | Falsey> => {
    // Use client's default scope,
    // if thrid-party app has not specified "scope" query parameter in authorization,
    if (!scope) {
      return client.scope
    }

    // TODO: validate scope with client's scope in DB
    scope = scope instanceof Array ? scope : this.scopeStr2Arr(scope)
    return scope
  }

  verifyScope = async (
    accessToken: OAuthToken,
    scope: string | string[]
  ): Promise<boolean> => {
    //TODO: Maybe we don't have to implement this?
    return true
  }

  /*********************************
   *                               *
   *           LikeCoin            *
   *                               *
   *********************************/
  generateTokenForLikeCoin = async ({ userId }: { userId: string }) => {
    const userService = new UserService()
    const user = (await userService.dataloader.load(userId)) as User
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
    return await this.saveToken(
      {
        accessToken,
        accessTokenExpiresAt: new Date(
          Date.now() + OAUTH_ACCESS_TOKEN_EXPIRES_IN
        ),
        refreshToken,
        refreshTokenExpiresAt: new Date(
          Date.now() + OAUTH_REFRESH_TOKEN_EXPIRES_IN
        ),
        scope: client.scope,
        client,
        user
      },
      client,
      user
    )
  }
}
