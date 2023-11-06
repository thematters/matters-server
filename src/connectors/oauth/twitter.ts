import axios from 'axios'
import crypto from 'node:crypto'
import Oauth from 'oauth-1.0a'

import { environment } from 'common/environment'
import { getLogger } from 'common/logger'

const logger = getLogger('oauth-twitter')

const hash_function_sha1 = (base_string: string, key: string) => {
  return crypto.createHmac('sha1', key).update(base_string).digest('base64')
}

// Twitter OAuth 1.0a flow
// see https://developer.twitter.com/en/docs/authentication/guides/log-in-with-twitter
export class Twitter {
  private oauth: Oauth

  public constructor() {
    this.oauth = new Oauth({
      consumer: {
        key: environment.twitterConsumerKey,
        secret: environment.twitterConsumerSecret,
      },
      signature_method: 'HMAC-SHA1',
      hash_function: hash_function_sha1,
    })
  }

  public requestToken = async () => {
    const requestData = {
      url: 'https://api.twitter.com/oauth/request_token',
      method: 'POST',
      data: { oauth_callback: environment.twitterRedirectUri },
    }

    const authHeaders = this.oauth.toHeader(this.oauth.authorize(requestData))
    const response = await axios.post(requestData.url, requestData.data, {
      headers: authHeaders as any,
    })
    if (response.status !== 200) {
      logger.error('request token failed', response.data)
      throw new Error(`request token failed with status ${response.status}`)
    }
    const parsedData = Object.fromEntries(
      response.data.split('&').map((s: string) => s.split('='))
    )
    if (!parsedData.oauth_callback_confirmed) {
      logger.error('oauth_callback_confirmed not found', response.data)
      throw new Error('oauth_callback_confirmed not found')
    }
    if (!parsedData.oauth_token) {
      logger.error('oauth_token not found', response.data)
      throw new Error('oauth_token not found')
    }

    return parsedData.oauth_token
  }
  public fetchAccessToken = async (
    oauthToken: string,
    oauthVerifier: string
  ) => {
    const requestData = {
      url: 'https://api.twitter.com/oauth/access_token',
      method: 'POST',
      data: { oauth_token: oauthToken, oauth_verifier: oauthVerifier },
    }
    const authHeaders = this.oauth.toHeader(this.oauth.authorize(requestData))
    const response = await axios.post(requestData.url, requestData.data, {
      headers: authHeaders as any,
    })
    if (response.status !== 200) {
      logger.error('fetch access token failed', response.data)
      throw new Error(
        `fetch access token failed with status ${response.status}`
      )
    }
    const parsedData = Object.fromEntries(
      response.data.split('&').map((s: string) => s.split('='))
    )
    if (
      !parsedData.oauth_token ||
      !parsedData.oauth_token_secret ||
      !parsedData.user_id ||
      !parsedData.screen_name
    ) {
      logger.error('unexpected data', response.data)
      throw new Error('unexpected data')
    }
    return {
      id: parsedData.user_id,
      username: parsedData.screen_name,
      oauthToken: parsedData.oauth_token,
      oauthTokenSecret: parsedData.oauth_token_secret,
    }
  }
  public invokeToken = async (oauthToken: string, oauthTokenSecret: string) => {
    const requestData = {
      url: 'https://api.twitter.com/1.1/oauth/invalidate_token',
      method: 'POST',
    }
    const authHeaders = this.oauth.toHeader(
      this.oauth.authorize(requestData, {
        key: oauthToken,
        secret: oauthTokenSecret,
      })
    )
    const response = await axios.post(requestData.url, undefined, {
      headers: authHeaders as any,
    })
    if (response.status !== 200) {
      logger.error('invoke token failed', response.data)
      throw new Error(`invoke token failed with status ${response.status}`)
    }
  }
}
