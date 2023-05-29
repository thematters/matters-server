import axios, { AxiosRequestConfig } from 'axios'
import { Knex } from 'knex'
import _ from 'lodash'
import { v4 } from 'uuid'

import { CACHE_PREFIX, CACHE_TTL, QUEUE_URL } from 'common/enums'
import { environment } from 'common/environment'
import {
  LikerEmailExistsError,
  LikerISCNPublishWithoutWalletError,
  LikerUserIdExistsError,
  OAuthTokenInvalidError,
} from 'common/errors'
import { getLogger } from 'common/logger'
import { aws, CacheService, knex } from 'connectors'
import { UserOAuthLikeCoin } from 'definitions'

const logger = getLogger('service-likecoin')

interface LikeData {
  likerId: string
  likerIp?: string
  userAgent: string
  authorLikerId: string
  url: string
  amount: number
}

interface SendPVData {
  likerId?: string
  likerIp?: string
  userAgent: string
  authorLikerId: string
  url: string
}

interface UpdateCivicLikerCacheData {
  likerId: string
  userId: string
  key: string
  expire: (typeof CACHE_TTL)[keyof typeof CACHE_TTL]
}

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
  superlike: '/like/share',
  iscnPublish: '/iscn/new?claim=1',
  cosmosTx: '/cosmos/lcd/txs',
}

/**
 * Interact with LikeCoin
 *
 * API Docs:
 * @see {@url https://documenter.getpostman.com/view/6879252/SVzxZfwH?version=latest}
 */
export class LikeCoin {
  knex: Knex
  cache: CacheService
  aws: typeof aws

  constructor() {
    this.knex = knex
    this.cache = new CacheService(CACHE_PREFIX.LIKECOIN)
    this.aws = aws
  }

  /**
   * Base Request
   */
  request = async ({
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
        throw err
      }
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
          updatedAt: knex.fn.now(), // new Date(),
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
    ip,
  }: {
    user: string
    token: string
    ip?: string
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
      ip,
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

    return data.cosmosLIKE || data.walletLIKE
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
  isCivicLiker = async ({
    likerId,
    userId,
  }: {
    likerId: string
    userId: string
  }) => {
    const cache = new CacheService(CACHE_PREFIX.CIVIC_LIKER)
    const keys = { id: likerId }
    const isCivicLiker = await cache.getObject({
      keys,
      getter: async () => {
        this.updateCivicLikerCache({
          likerId,
          userId,
          key: cache.genKey(keys),
          expire: CACHE_TTL.LONG,
        })
        return false
      },
      expire: CACHE_TTL.SHORT,
    })
    return isCivicLiker
  }

  /**
   * Check if user is a civic liker
   */
  getCosmosWallet = async ({ liker }: { liker: UserOAuthLikeCoin }) => {
    const res = await this.request({
      endpoint: `/users/id/${liker.likerId}/min`,
      method: 'GET',
      // liker,
    })
    return _.get(res, 'data.cosmosWallet')
  }

  /**
   * Send page view to likecoin
   */
  sendPV = async (data: SendPVData) =>
    this.aws.sqsSendMessage({
      messageBody: data,
      queueUrl: QUEUE_URL.likecoinSendPV,
    })

  /**
   * Like a content.
   */
  like = async (data: LikeData) =>
    this.aws.sqsSendMessage({
      messageBody: data,
      queueUrl: QUEUE_URL.likecoinLike,
      messageGroupId: 'like',
      messageDeduplicationId: v4(),
    })

  /**
   * Super Like
   */
  superlike = async ({
    authorLikerId,
    liker,
    iscn_id,
    url,
    likerIp,
    userAgent,
  }: {
    authorLikerId: string
    liker: UserOAuthLikeCoin
    iscn_id?: string
    url: string
    likerIp?: string
    userAgent: string
  }) => {
    const endpoint = `${ENDPOINTS.superlike}/${authorLikerId}/`
    const result = await this.request({
      ip: likerIp,
      userAgent,
      endpoint,
      withClientCredential: true,
      method: 'POST',
      liker,
      data: _.omitBy(
        {
          iscn_id,
          referrer: url, // encodeURI(url),
        },
        _.isNil
      ),
    })
    const data = _.get(result, 'data')
    if (data) {
      return data
    } else {
      throw result
    }
  }

  canSuperLike = async ({
    liker,
    iscn_id,
    url,
    likerIp,
    userAgent,
  }: {
    liker: UserOAuthLikeCoin
    iscn_id?: string
    url: string
    likerIp?: string
    userAgent: string
  }) => {
    const endpoint = `${ENDPOINTS.superlike}/self`

    const res = await this.request({
      endpoint,
      method: 'GET',
      ip: likerIp,
      userAgent,
      withClientCredential: true,
      params: _.omitBy(
        {
          iscn_id,
          referrer: url, // encodeURI(url),
        },
        _.isNil
      ),
      liker,
    })
    const data = _.get(res, 'data')

    if (!data) {
      throw res
    }

    return data.canSuperLike
  }

  iscnPublish = async ({
    mediaHash,
    ipfsHash,
    cosmosWallet,
    userName,
    title,
    description,
    datePublished,
    url,
    tags,
    liker,
  }: // likerIp,
  // userAgent,
  {
    mediaHash: string
    ipfsHash: string
    cosmosWallet: string
    userName: string
    title: string
    description: string
    datePublished: string // in format like 'YYYY-mm-dd' // "datePublished": "2019-04-19",
    url: string
    tags: string[]
    liker: UserOAuthLikeCoin
    // likerIp?: string
    // userAgent?: string
  }) => {
    const endpoint = `${ENDPOINTS.iscnPublish}`

    if (!(cosmosWallet && liker)) {
      throw new LikerISCNPublishWithoutWalletError('no liker or no wallet')
    }

    const postData = {
      recordNotes: 'Add IPFS fingerprint (by Matters.News)',
      contentFingerprints: [
        // "hash://sha256/9564b85669d5e96ac969dd0161b8475bbced9e5999c6ec598da718a3045d6f2e",
        mediaHash,
        ipfsHash, // "ipfs://QmNrgEMcUygbKzZeZgYFosdd27VE9KnWbyUD73bKZJ3bGi111"
      ],
      stakeholders: [
        {
          entity: {
            '@id': `did:cosmos:${cosmosWallet}`,
            name: userName,
          },
          rewardProportion: 100,
          contributionType: 'http://schema.org/author',
        },
        {
          rewardProportion: 0,
          contributionType: 'http://schema.org/publisher',
          entity: {
            name: 'Matters.News',
          },
          // "footprint": "https://en.wikipedia.org/wiki/Fibonacci_number",
          // "description": "The blog post referred the matrix form of computing Fibonacci numbers."
        },
      ],
      type: 'Article',
      name: title, // "使用矩陣計算遞歸關係式",
      description, // "description": "An article on computing recursive function with matrix multiplication.",
      datePublished, // "datePublished": "2019-04-19",
      url, // "url": "https://nnkken.github.io/post/recursive-relation/",
      // "usageInfo": "https://creativecommons.org/licenses/by/4.0",
      keywords: tags, // ["matrix","recursion","keyword3"]
    }

    const res = await this.request({
      endpoint,
      // ip: likerIp,
      // userAgent,
      withClientCredential: true,
      method: 'POST',
      data: postData,
      liker,
    })

    const data = _.get(res, 'data')

    this.cache.storeObject({
      // keys: ['iscnPublish', userName, 'likerId', liker.likerId],
      keys: {
        type: 'iscnPublish',
        id: userName,
        field: 'likerId',
        args: { likerId: liker.likerId, mediaHash },
      },
      data: {
        postData,
        resData: data,
      },
      expire: CACHE_TTL.LONG, // save for 1 day
    })

    if (!data) {
      logger.error('iscnPublish with no data: %j', res)
      throw res
    }

    if (!data.iscnId) {
      logger.warn(
        'iscnPublish failed posted results: %j with: %j',
        res,
        postData
      )
    }

    return data.iscnId
  }

  getCosmosTxData = async ({ hash }: { hash: string }) => {
    const endpoint = `${ENDPOINTS.cosmosTx}/${hash}`
    const result = await this.request({
      endpoint,
      method: 'GET',
    })
    const data = _.get(result, 'data')

    if (!data) {
      throw result
    }
    const msg = _.get(data, 'tx.value.msg')
    const msgSend = _.find(msg, { type: 'cosmos-sdk/MsgSend' })
    const amount = _.get(msgSend, 'value.amount[0].amount')
    return { amount }
  }

  private updateCivicLikerCache = async (data: UpdateCivicLikerCacheData) =>
    this.aws.sqsSendMessage({
      messageBody: data,
      queueUrl: QUEUE_URL.likecoinUpdateCivicLikerCache,
    })
}

export const likecoin = new LikeCoin()
