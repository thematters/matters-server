import axios from 'axios'

import { CACHE_TTL } from 'common/enums'
import { environment } from 'common/environment'
import { NetworkError, UnknownError } from 'common/errors'
import { getLogger } from 'common/logger'
import { CacheService } from 'connectors'

const logger = getLogger('service-exchange-rate')

// TYPES

type TokenCurrency = 'LIKE' | 'USDT'
type FiatCurrency = 'HKD'

type FromCurrency = TokenCurrency | FiatCurrency
type ToCurrency = 'HKD' | 'TWD' | 'USD'

interface Pair {
  from: FromCurrency
  to: ToCurrency
}

interface Rate extends Pair {
  rate: number
  updatedAt: Date
}

// CONSTANTS

const tokenCurrencies: TokenCurrency[] = ['LIKE', 'USDT']
const fiatCurrencies: FiatCurrency[] = ['HKD']
const quoteCurrencies: ToCurrency[] = ['TWD', 'HKD', 'USD']

const TOKEN_TO_COINGECKO_ID = {
  LIKE: 'likecoin',
  USDT: 'tether',
} as const

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price'
const EXCHANGE_RATES_DATA_API_URL =
  'https://api.apilayer.com/exchangerates_data/latest'

// MAIN

export class ExchangeRate {
  cache: CacheService
  expire: number
  constructor() {
    this.cache = new CacheService('exchangeRate')
    this.expire = CACHE_TTL.STATIC
  }

  getRates = async (
    from?: FromCurrency,
    to?: ToCurrency
  ): Promise<Rate[] | never> => {
    const allPairs = [...this.getTokenPairs(), ...this.getFiatPairs()]
    let pairs = allPairs
    if (from) {
      pairs = pairs.filter((p) => p.from === from)
    }
    if (to) {
      pairs = pairs.filter((p) => p.to === to)
    }

    return Promise.all(pairs.map((p) => this.getRate(p.from, p.to)))
  }

  getRate = async (
    from: FromCurrency,
    to: ToCurrency
  ): Promise<Rate | never> => {
    const data = (await this.cache.getObject({
      keys: this.genCacheKeys({ from, to }),
      getter: async () => this.fetchRate({ from, to }),
      expire: this.expire,
    })) as any
    if (!data) {
      throw new UnknownError('Unexpected null')
    }
    return {
      from,
      to,
      rate: data.rate,
      updatedAt: new Date(data.updatedAt),
    }
  }

  private fetchRate = async ({ from, to }: Pair): Promise<Rate | never> => {
    logger.info(
      'exchangeRate requested APIs to get rates instead of from cache'
    )

    // type predicates
    const isToken = (currency: FromCurrency): currency is TokenCurrency =>
      tokenCurrencies.includes(currency as any)
    const isFiat = (currency: FromCurrency): currency is FiatCurrency =>
      fiatCurrencies.includes(currency as any)

    let rate: Rate
    if (isToken(from)) {
      const data = await this.requestCoingeckoAPI([from], [to])
      rate = this.parseCoingeckoData(data, { from, to })
    } else if (isFiat(from)) {
      const data = await this.requestExchangeRatesDataAPI(from, [to])
      rate = this.parseExchangeRateData(data, { from, to })
    } else {
      throw new UnknownError('Unknown currency')
    }
    return rate
  }

  private genCacheKeys = (pair: Pair) => ({ id: pair.from + pair.to })

  private getTokenPairs = () => {
    const pairs = []
    for (const t of tokenCurrencies) {
      for (const q of quoteCurrencies) {
        pairs.push({ from: t, to: q })
      }
    }
    return pairs
  }

  private getFiatPairs = () => {
    const pairs = []
    for (const f of fiatCurrencies) {
      for (const q of quoteCurrencies) {
        pairs.push({ from: f, to: q })
      }
    }
    return pairs
  }

  private parseCoingeckoData = (
    data: any,
    pair: { from: TokenCurrency; to: ToCurrency }
  ): Rate => ({
    from: pair.from,
    to: pair.to,
    rate: data[TOKEN_TO_COINGECKO_ID[pair.from]][pair.to.toLowerCase()],
    updatedAt: new Date(
      data[TOKEN_TO_COINGECKO_ID[pair.from]].last_updated_at * 1000
    ),
  })

  private parseExchangeRateData = (data: any, pair: Pair): Rate => ({
    from: pair.from,
    to: pair.to,
    rate: data.rates[pair.to],
    updatedAt: new Date(data.timestamp * 1000),
  })

  private requestCoingeckoAPI = async (
    bases: TokenCurrency[],
    quotes: ToCurrency[]
  ): Promise<any | never> => {
    const ids = bases.map((i) => TOKEN_TO_COINGECKO_ID[i]).join()
    const vs_currencies = quotes.join()
    try {
      const reps = await axios.get(COINGECKO_API_URL, {
        params: {
          ids,
          vs_currencies,
          include_last_updated_at: true,
        },
      })
      if (reps.status !== 200) {
        throw new UnknownError(
          `Unexpected Coingecko response code: ${reps.status}`
        )
      }
      return reps.data
    } catch (error: any) {
      const path = error.request.path
      const msg = error.response.data
        ? JSON.stringify(error.response.data)
        : error
      throw new NetworkError(
        `Failed to request Coingecko API( ${path} ): ${msg}`
      )
    }
  }

  private requestExchangeRatesDataAPI = async (
    base: FiatCurrency,
    quotes: ToCurrency[]
  ): Promise<any | never> => {
    const symbols = quotes.join()
    const headers = { apikey: environment.exchangeRatesDataAPIKey }
    try {
      const reps = await axios.get(EXCHANGE_RATES_DATA_API_URL, {
        params: {
          base,
          symbols,
        },
        headers,
      })
      if (!reps.data.success) {
        throw new UnknownError(
          `Unexpected Exchange Rates Data API response status`
        )
      }
      return reps.data
    } catch (error: any) {
      const path = error.request.path
      const msg = error.response.data
        ? JSON.stringify(error.response.data)
        : error
      throw new NetworkError(
        `Failed to request Exchange Rates Data API( ${path} ): ${msg}`
      )
    }
  }
}
