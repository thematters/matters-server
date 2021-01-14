import axios, { AxiosRequestConfig } from 'axios'
import Knex from 'knex'
import _ from 'lodash'

import { environment } from 'common/environment'
import {
  LikerEmailExistsError,
  LikerUserIdExistsError,
  OAuthTokenInvalidError,
} from 'common/errors'
import logger from 'common/logger'
import { knex } from 'connectors'
import { UserOAuthLikeCoin } from 'definitions'

const { likecoinApiURL, likecoinClientId, likecoinClientSecret } = environment

const ERROR_CODES = {
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  EMAIL_ALREADY_USED: 'EMAIL_ALREADY_USED',
  OAUTH_USER_ID_ALREADY_USED: 'OAUTH_USER_ID_ALREADY_USED',
  LOGIN_NEEDED: 'LOGIN_NEEDED',
  INSUFFICIENT_PERMISSION: 'INSUFFICIENT_PERMISSION',
}

type LikeCoinLocale =
  | 'en'
  | 'zh'
  | 'cn'
  | 'de'
  | 'es'
  | 'fr'
  | 'it'
  | 'ja'
  | 'ko'
  | 'pt'
  | 'ru'

type RequestProps = {
  endpoint: string
  headers?: { [key: string]: any }
  liker?: UserOAuthLikeCoin
  withClientCredential?: boolean
} & AxiosRequestConfig

const ENDPOINTS = {
  acccessToken: '/oauth/access_token',
  check: '/users/new/check',
  register: '/users/new/matters',
  edit: '/users/edit/matters',
  total: '/like/info/like/history/total',
  like: '/like/likebutton',
  rate: '/misc/price',
  superlike: '/like/share',
}

/**
 * Interact with LikeCoin
 *
 * API Docs:
 * @see {@url https://documenter.getpostman.com/view/6879252/SVzxZfwH?version=latest}
 */
export class LikeCoin {
  knex: Knex

  constructor() {
    this.knex = knex
  }

  /**
   * Base Request
   */
  request = async ({
    endpoint,
    liker,
    withClientCredential,
    headers = {},
    ...axiosOptions
  }: RequestProps) => {
    const makeRequest = ({ accessToken }: { accessToken?: string }) => {
      // Headers
      if (accessToken) {
        headers = {
          ...headers,
          Authorization: `Bearer ${accessToken}`,
        }
      }

      // Params
      let params = {}
      if (withClientCredential) {
        if (axiosOptions.method === 'GET') {
          params = {
            ...params,
            client_id: likecoinClientId,
            client_secret: likecoinClientSecret,
          }
        } else if (axiosOptions.data) {
          axiosOptions.data = {
            ...axiosOptions.data,
            client_id: likecoinClientId,
            client_secret: likecoinClientSecret,
          }
        }
      }

      return axios({
        url: endpoint,
        baseURL: likecoinApiURL,
        params,
        headers,
        ...axiosOptions,
      })
    }

    try {
      return await makeRequest({
        accessToken: liker ? liker.accessToken : undefined,
      })
    } catch (e) {
      const data = _.get(e, 'response.data')

      // refresh token and retry once
      if (liker && data === ERROR_CODES.TOKEN_EXPIRED) {
        const accessToken = await this.refreshToken({ liker })
        return makeRequest({ accessToken })
      }

      if (data === ERROR_CODES.EMAIL_ALREADY_USED) {
        throw new LikerEmailExistsError('email already used.')
      }

      if (data === ERROR_CODES.OAUTH_USER_ID_ALREADY_USED) {
        throw new LikerUserIdExistsError('user id already used.')
      }

      // notify client to prompt the user for reauthentication.
      if (
        data === ERROR_CODES.LOGIN_NEEDED ||
        data === ERROR_CODES.INSUFFICIENT_PERMISSION
      ) {
        throw new OAuthTokenInvalidError(
          "token hasn's permission to access the resource, please reauth."
        )
      }

      logger.error(e)
      throw e
    }
  }

  refreshToken = async ({
    liker,
  }: {
    liker: UserOAuthLikeCoin
  }): Promise<string> => {
    const res = await this.request({
      endpoint: ENDPOINTS.acccessToken,
      withClientCredential: true,
      method: 'POST',
      data: {
        grant_type: 'refresh_token',
        refresh_token: liker.refreshToken,
      },
    })

    // update db
    const data = _.get(res, 'data')
    try {
      await this.knex('user_oauth_likecoin')
        .where({ likerId: liker.likerId })
        .update({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          scope: data.scope,
          updatedAt: new Date(),
        })
    } catch (e) {
      logger.error(e)
    }

    return data.access_token
  }

  /**
   * Register
   */
  check = async ({ user, email }: { user: string; email?: string }) => {
    try {
      const res = await this.request({
        endpoint: ENDPOINTS.check,
        method: 'POST',
        data: {
          user,
          email,
        },
      })
      const data = _.get(res, 'data')

      if (data === 'OK') {
        return user
      } else {
        throw res
      }
    } catch (e) {
      const data = _.get(e, 'response.data')
      const alternative = _.get(data, 'alternative')

      if (alternative) {
        return alternative
      }

      throw e
    }
  }

  register = async ({
    user,
    token,
    displayName,
    email,
    locale = 'zh',
    isEmailEnabled,
  }: {
    user: string
    token: string
    displayName?: string
    email?: string
    locale?: LikeCoinLocale
    isEmailEnabled?: boolean
  }) => {
    const res = await this.request({
      endpoint: ENDPOINTS.register,
      withClientCredential: true,
      method: 'POST',
      data: {
        user,
        token,
        displayName,
        email,
        locale,
        isEmailEnabled,
      },
    })
    const data = _.get(res, 'data')

    if (data.accessToken && data.refreshToken) {
      return data
    } else {
      throw res
    }
  }

  /**
   * Claim, Transfer or Bind
   */
  edit = async ({
    action,
    payload,
  }: {
    action: 'claim' | 'transfer' | 'bind'
    payload: { [key: string]: any }
  }) => {
    const res = await this.request({
      endpoint: ENDPOINTS.edit,
      withClientCredential: true,
      method: 'POST',
      data: {
        action,
        payload,
      },
    })
    const data = _.get(res, 'data')

    if (!data) {
      throw res
    }

    return
  }

  /**
   * Info
   */
  total = async ({ liker }: { liker: UserOAuthLikeCoin }) => {
    const res = await this.request({
      endpoint: ENDPOINTS.total,
      method: 'GET',
      liker,
    })
    const data = _.get(res, 'data')

    if (!data) {
      throw res
    }

    return data.total
  }

  rate = async (currency: 'usd' | 'twd' = 'usd') => {
    const res = await this.request({
      endpoint: ENDPOINTS.rate,
      method: 'GET',
      params: {
        currency,
      },
    })
    const price = _.get(res, 'data.price')

    return price
  }

  /**
   * Check if user is a civic liker
   */
  isCivicLiker = async ({ liker }: { liker: UserOAuthLikeCoin }) => {
    const res = await this.request({
      endpoint: `/users/id/${liker.likerId}/min`,
      method: 'GET',
      liker,
    })
    return !!_.get(res, 'data.isSubscribedCivicLiker')
  }

  /**
   * current user like count of a content
   */
  count = async ({
    liker,
    authorLikerId,
    url,
    likerIp,
    userAgent,
  }: {
    liker?: UserOAuthLikeCoin
    authorLikerId: string
    url: string
    likerIp?: string
    userAgent: string
  }) => {
    const endpoint = `${ENDPOINTS.like}/${authorLikerId}/self`
    const res = await this.request({
      endpoint,
      method: 'GET',
      liker,
      headers: {
        'X-LIKECOIN-REAL-IP': likerIp,
        'X-LIKECOIN-USER-AGENT': userAgent,
      },
      withClientCredential: true,
      params: {
        referrer: encodeURI(url),
      },
    })
    const data = _.get(res, 'data')

    if (!data) {
      throw res
    }

    return data.count
  }

  /**
   * Like a content.
   */
  like = async ({
    authorLikerId,
    liker,
    url,
    likerIp,
    amount,
    userAgent,
  }: {
    authorLikerId: string
    liker: UserOAuthLikeCoin
    url: string
    likerIp?: string
    amount: number
    userAgent: string
  }) => {
    try {
      const endpoint = `${ENDPOINTS.like}/${authorLikerId}/${amount}`
      const result = await this.request({
        headers: {
          'X-LIKECOIN-REAL-IP': likerIp,
          'X-LIKECOIN-USER-AGENT': userAgent,
        },
        endpoint,
        withClientCredential: true,
        method: 'POST',
        liker,
        data: {
          referrer: encodeURI(url),
        },
      })
      const data = _.get(result, 'data')
      if (data === 'OK') {
        return data
      } else {
        throw result
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * Super Like
   */
  superlike = async ({
    authorLikerId,
    liker,
    url,
    likerIp,
    userAgent,
  }: {
    authorLikerId: string
    liker: UserOAuthLikeCoin
    url: string
    likerIp?: string
    userAgent: string
  }) => {
    try {
      const endpoint = `${ENDPOINTS.superlike}/${authorLikerId}/`
      const result = await this.request({
        headers: {
          'X-LIKECOIN-REAL-IP': likerIp,
          'X-LIKECOIN-USER-AGENT': userAgent,
        },
        endpoint,
        withClientCredential: true,
        method: 'POST',
        liker,
        data: {
          referrer: encodeURI(url),
        },
      })
      const data = _.get(result, 'data')
      if (data === 'OK') {
        return data
      } else {
        throw result
      }
    } catch (error) {
      throw error
    }
  }

  canSuperLike = async ({
    liker,
    url,
    likerIp,
    userAgent,
  }: {
    liker: UserOAuthLikeCoin
    url: string
    likerIp?: string
    userAgent: string
  }) => {
    const endpoint = `${ENDPOINTS.superlike}/self`

    const res = await this.request({
      endpoint,
      method: 'GET',
      headers: {
        'X-LIKECOIN-REAL-IP': likerIp,
        'X-LIKECOIN-USER-AGENT': userAgent,
      },
      withClientCredential: true,
      params: {
        referrer: encodeURI(url),
      },
      liker,
    })
    const data = _.get(res, 'data')

    if (!data) {
      throw res
    }

    return data.canSuperLike
  }
}

export const likecoin = new LikeCoin()
