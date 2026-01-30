import type { UserOAuthLikeCoin, Connections } from '#definitions/index.js'
import type { Knex } from 'knex'

import { environment } from '#common/environment.js'
import {
  LikerEmailExistsError,
  LikerUserIdExistsError,
  OAuthTokenInvalidError,
} from '#common/errors.js'
import { getLogger } from '#common/logger.js'
import * as Sentry from '@sentry/node'
import axios, { type AxiosRequestConfig } from 'axios'
import _ from 'lodash'

const logger = getLogger('service-likecoin')


const { likecoinApiURL, likecoinClientId, likecoinClientSecret } = environment

const ERROR_CODES = {
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  EMAIL_ALREADY_USED: 'EMAIL_ALREADY_USED',
  OAUTH_USER_ID_ALREADY_USED: 'OAUTH_USER_ID_ALREADY_USED',
  LOGIN_NEEDED: 'LOGIN_NEEDED',
  INSUFFICIENT_PERMISSION: 'INSUFFICIENT_PERMISSION',
}

type RequestProps = {
  endpoint: string
  headers?: { [key: string]: any }
  liker?: UserOAuthLikeCoin
  withClientCredential?: boolean
  ip?: string
  userAgent?: string
} & AxiosRequestConfig

const ENDPOINTS = {
  acccessToken: '/oauth/access_token',
  check: '/users/new/check',
  register: '/users/new/matters',
  edit: '/users/edit/matters',
  total: '/like/info/like/amount',
  like: '/like/likebutton',
  rate: '/misc/price',
  iscnPublish: '/iscn/new?claim=1',
  cosmosTx: '/cosmos/lcd/cosmos/tx/v1beta1/txs',
}

/**
 * Interact with LikeCoin
 *
 * API Docs:
 * @see {@url https://documenter.getpostman.com/view/6879252/SVzxZfwH?version=latest}
 */
export class LikeCoin {
  private knex: Knex

  public constructor(connections: Connections) {
    this.knex = connections.knex
  }

  /**
   * Base Request
   */
  private request = async ({
    endpoint,
    liker,
    withClientCredential,
    ip,
    userAgent,
    headers = {},
    ...axiosOptions
  }: RequestProps) => {
    let accessToken = liker?.accessToken
    const makeRequest = () => {
      // Headers
      if (accessToken) {
        headers = {
          ...headers,
          Authorization: `Bearer ${accessToken}`,
        }
      }
      if (ip) {
        headers = {
          ...headers,
          'X-LIKECOIN-REAL-IP': ip,
        }
      }
      if (userAgent) {
        headers = {
          ...headers,
          'X-LIKECOIN-USER-AGENT': userAgent,
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

      logger.info('request %s with %j', endpoint, axiosOptions.data)
      return axios({
        url: endpoint,
        baseURL: likecoinApiURL,
        params,
        headers,
        ...axiosOptions,
      })
    }

    let retries = 0
    while (retries < 2) {
      // call makeRequest at most twice
      try {
        return await makeRequest()
      } catch (err: any) {
        const data = _.get(err, 'response.data')

        switch (data) {
          case ERROR_CODES.TOKEN_EXPIRED:
          case ERROR_CODES.LOGIN_NEEDED:
            if (liker && retries++ < 1) {
              accessToken = await this.refreshToken({ liker })
              continue
            }
            break

          case ERROR_CODES.EMAIL_ALREADY_USED:
            throw new LikerEmailExistsError('email already used.')
          case ERROR_CODES.OAUTH_USER_ID_ALREADY_USED:
            throw new LikerUserIdExistsError('user id already used.')

          // notify client to prompt the user for reauthentication.
          // case ERROR_CODES.LOGIN_NEEDED: // was not re-trying
          case ERROR_CODES.INSUFFICIENT_PERMISSION:
            throw new OAuthTokenInvalidError(
              'token has no permission to access the resource, please reauth.'
            )
        }

        logger.error(err)
        Sentry.captureException(err)

        throw err
      }
    }
  }

  public refreshToken = async ({
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
          updatedAt: this.knex.fn.now(), // new Date(),
        })
    } catch (e) {
      logger.error(e)
      Sentry.captureException(e)
    }

    return data.access_token
  }

  /**
   * Claim, Transfer or Bind
   */
  public edit = async ({
    action,
    payload,
    ip,
  }: {
    action: 'claim' | 'transfer' | 'bind'
    payload: { [key: string]: any }
    ip?: string
  }) => {
    const res = await this.request({
      endpoint: ENDPOINTS.edit,
      withClientCredential: true,
      method: 'POST',
      data: {
        action,
        payload,
      },
      ip,
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
  public total = async ({ liker }: { liker: UserOAuthLikeCoin }) => {
    const res = await this.request({
      endpoint: ENDPOINTS.total,
      method: 'GET',
      liker,
    })
    const data = _.get(res, 'data')

    if (!data) {
      throw res
    }

    return data.cosmosLIKE || data.walletLIKE
  }

  /**
   * Check if user is a civic liker
   */
  public getCosmosWallet = async ({ liker }: { liker: UserOAuthLikeCoin }) => {
    const res = await this.request({
      endpoint: `/users/id/${liker.likerId}/min`,
      method: 'GET',
      // liker,
    })
    return _.get(res, 'data.cosmosWallet')
  }

  public getCosmosTxData = async ({ hash }: { hash: string }) => {
    const endpoint = `${ENDPOINTS.cosmosTx}/${hash}`
    const result = await this.request({
      endpoint,
      method: 'GET',
    })
    const data = _.get(result, 'data')

    if (!data) {
      throw result
    }
    const code = _.get(data, 'tx_response.code')
    if (code) {
      throw code
    }
    const msg = _.get(data, 'tx.body.messages')
    const msgSend = _.find(msg, { '@type': '/cosmos.bank.v1beta1.MsgSend' })
    const amount = _.get(msgSend, 'amount[0].amount')
    return { amount }
  }
}
