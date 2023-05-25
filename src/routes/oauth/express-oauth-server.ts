// @fork https://github.com/oauthjs/express-oauth-server/
import express from 'express'
import OAuth2Server from 'oauth2-server'

class ExpressOAuthServer {
  server: OAuth2Server

  constructor(options: OAuth2Server.ServerOptions) {
    options = options || {}

    if (!options.model) {
      throw new OAuth2Server.InvalidArgumentError('Missing parameter: `model`')
    }

    this.server = new OAuth2Server(options)
  }

  /**
   * Authentication Middleware.
   *
   * Returns a middleware that will validate a token.
   *
   * (See: https://tools.ietf.org/html/rfc6749#section-7)
   */
  authenticate = (options?: OAuth2Server.AuthenticateOptions) => {
    return async (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      const request = new OAuth2Server.Request(req)
      const response = new OAuth2Server.Response(res)

      try {
        const token = await this.server.authenticate(request, response, options)
        res.locals.oauth = { token }
        next()
      } catch (err: any) {
        return handleError.call(this, err, req, res, null, next)
      }
    }
  }

  /**
   * Authorization Middleware.
   *
   * Returns a middleware that will authorize a client to request tokens.
   *
   * (See: https://tools.ietf.org/html/rfc6749#section-3.1)
   */
  authorize = (options?: OAuth2Server.AuthorizeOptions) => {
    return async (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      const request = new OAuth2Server.Request(req)
      const response = new OAuth2Server.Response(res)

      try {
        const code = await this.server.authorize(request, response, options)
        res.locals.oauth = { code }
        return handleResponse.call(this, req, res, response)
      } catch (err: any) {
        return handleError.call(this, err, req, res, response, next)
      }
    }
  }

  /**
   * Grant Middleware.
   *
   * Returns middleware that will grant tokens to valid requests.
   *
   * (See: https://tools.ietf.org/html/rfc6749#section-3.2)
   */
  token = (options?: OAuth2Server.TokenOptions) => {
    return async (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      const request = new OAuth2Server.Request(req)
      const response = new OAuth2Server.Response(res)

      try {
        const token = await this.server.token(request, response, options)
        res.locals.oauth = { token }
        return handleResponse.call(this, req, res, response)
      } catch (err: any) {
        return handleError.call(this, err, req, res, response, next)
      }
    }
  }
}

/**
 * Handle response.
 */
const handleResponse = (
  req: express.Request,
  res: express.Response,
  response: OAuth2Server.Response
) => {
  if (response.status === 302) {
    const headers = response.headers || {}
    const location = headers.location
    delete headers.location
    res.set(response.headers)
    res.redirect(location)
  } else {
    res.set(response.headers)
    if (response.status) {
      res.status(response.status)
    }
    res.send(response.body)
  }
}

/**
 * Handle error.
 */
const handleError = (
  e: OAuth2Server.OAuthError,
  req: express.Request,
  res: express.Response,
  response: OAuth2Server.Response | null,
  next: express.NextFunction
) => {
  if (response) {
    const headers = response.headers || {}

    res.set(headers)

    if (headers.location) {
      return res.status(302).redirect(headers.location)
    }
  }

  res.status(e.code)

  if (e instanceof OAuth2Server.UnauthorizedRequestError) {
    return res.send()
  }

  res.send({ error: e.name, error_description: e.message })
}

export default ExpressOAuthServer
