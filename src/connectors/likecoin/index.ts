import axios from 'axios'
import _ from 'lodash'

import logger from 'common/logger'
import { environment } from 'common/environment'

const { likecoinApiURL, likecoinClientId, likecoinClientSecret } = environment

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

export class LikeCoin {
  endpoints: { check: string; register: string; edit: string }

  constructor() {
    this.endpoints = {
      check: '/users/new/check',
      register: '/users/new/matters',
      edit: '/users/edit/matters'
    }
  }

  /**
   * Register
   */
  check = async ({ user, email }: { user: string; email?: string }) => {
    try {
      const res = await axios({
        url: this.endpoints.check,
        baseURL: likecoinApiURL,
        method: 'POST',
        data: {
          user,
          email
        }
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

      console.error(e)
      logger.error(e)
      throw e
    }
  }

  register = async ({
    user,
    token,
    displayName,
    email,
    locale = 'zh',
    isEmailEnabled
  }: {
    user: string
    token: string
    displayName?: string
    email?: string
    locale?: LikeCoinLocale
    isEmailEnabled?: boolean
  }) => {
    try {
      const res = await axios({
        url: this.endpoints.register,
        baseURL: likecoinApiURL,
        method: 'POST',
        params: {
          client_id: likecoinClientId,
          client_secret: likecoinClientSecret
        },
        data: {
          user,
          token,
          displayName,
          email,
          locale,
          isEmailEnabled
        }
      })

      const data = _.get(res, 'data')
      if (data.accessToken && data.refreshToken) {
        return data
      } else {
        throw res
      }
    } catch (e) {
      console.error(e)
      logger.error(e)
      throw e
    }
  }

  /**
   * Claim or Transfer
   */
  edit = async ({
    user,
    action,
    payload
  }: {
    user: string
    action: 'claim' | 'transfer'
    payload: { [key: string]: any }
  }) => {
    try {
      const res = await axios({
        url: this.endpoints.edit,
        baseURL: likecoinApiURL,
        method: 'POST',
        params: {
          client_id: likecoinClientId,
          client_secret: likecoinClientSecret
        },
        data: {
          user,
          action,
          payload
        }
      })

      const data = _.get(res, 'data')
      if (data) {
        return
      } else {
        throw res
      }
    } catch (e) {
      console.error(e)
      logger.error(e)
      throw e
    }
  }
}

export const likecoin = new LikeCoin()
