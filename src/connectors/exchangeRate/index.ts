import axios from 'axios'

import { CACHE_TTL } from 'common/enums'
import { environment } from 'common/environment'
import { NetworkError, UnknownError } from 'common/errors'
import logger from 'common/logger'
import { CacheService } from 'connectors'
import {
  GQLExchangeRate,
  GQLQuoteCurrency,
  GQLTransactionCurrency,
} from 'definitions'

// TYPES

interface Pair {
  from: GQLTransactionCurrency
  to: GQLQuoteCurrency
}

type TokenCurrency = GQLTransactionCurrency.LIKE | GQLTransactionCurrency.USDT
type FiatCurrency = GQLTransactionCurrency.HKD

// CONSTANTS

const tokenCurrencies: TokenCurrency[] = [
  'LIKE' as GQLTransactionCurrency.LIKE,
  'USDT' as GQLTransactionCurrency.USDT,
]
const fiatCurrencies: FiatCurrency[] = ['HKD' as GQLTransactionCurrency.HKD]
const quoteCurrencies: GQLQuoteCurrency[] = [
  'TWD' as GQLQuoteCurrency.TWD,
  'HKD' as GQLQuoteCurrency.HKD,
  'USD' as GQLQuoteCurrency.USD,
]

const TOKEN_TO_COINGECKO_ID = {
  LIKE: 'likecoin',
  USDT: 'tether',
} as const

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price'
const EXCHANGE_RATES_DATA_API_URL =
  'https://api.apilayer.com/exchangerates_data/latest'

// TYPE PREDICATES

const isToken = (currency: GQLTransactionCurrency): currency is TokenCurrency =>
  tokenCurrencies.includes(currency as any)

const isFiat = (currency: GQLTransactionCurrency): currency is FiatCurrency =>
  fiatCurrencies.includes(currency as any)

// MAIN

export class ExchangeRate {
  cache: CacheService
  expire: number
  constructor() {
    this.cache = new CacheService('exchangeRate')
    this.expire = CACHE_TTL.STATIC
  }

  getRates = async (
    from?: GQLTransactionCurrency,
    to?: GQLQuoteCurrency
  ): Promise<GQLExchangeRate[] | never> => {
    const allPairs = [...this.getTokenPairs(), ...this.getFiatPairs()]
    let pairs = allPairs
    if (from) {
      pairs = pairs.filter((p) => p.from === from)
    }
    if (to) {
      pairs = pairs.filter((p) => p.to === to)
    }

    return Promise.all(pairs.map((p) => this.getRate(p)))
  }

  updateTokenRates = async () => {
    await this.updateRatesToCache(await this.fetchTokenRates())
  }

  updateFiatRates = async () => {
    await this.updateRatesToCache(await this.fetchFiatRates())
  }

  private getRate = async (pair: Pair): Promise<GQLExchangeRate | never> => {
    const data = (await this.cache.getObject({
      keys: this.genCacheKeys(pair),
      getter: async () => this.fetchAndCacheRate(pair),
      expire: this.expire,
    })) as any
    if (!data) {
      throw new UnknownError('Unexpected null')
    }
    return {
      from: data.from,
      to: data.to,
      rate: data.rate,
      updatedAt: new Date(data.updatedAt),
    }
  }

  private fetchAndCacheRate = async ({
    from,
    to,
  }: Pair): Promise<GQLExchangeRate | never> => {
    logger.warn(
      'exchangeRate requested APIs to get rates instead of from cache'
    )

    let rate: GQLExchangeRate
    if (isToken(from)) {
      const data = await this.requestCoingeckoAPI([from], [to])
      rate = this.parseCoingeckoData(data, { from, to })
    } else if (isFiat(from)) {
      const data = await this.requestExchangeRatesDataAPI(from, [to])
      rate = this.parseExchangeRateData(data, { from, to })
    } else {
      throw new UnknownError('Unknown currency')
    }
    await this.updateRatesToCache([rate])
    return rate
  }

  private updateRatesToCache = async (rates: GQLExchangeRate[]) => {
    for (const rate of rates) {
      this.cache.storeObject({
        keys: this.genCacheKeys(rate),
        data: rate,
        expire: this.expire,
      })
    }
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

  private fetchTokenRates = async (): Promise<GQLExchangeRate[]> => {
    const data = await this.requestCoingeckoAPI(
      tokenCurrencies,
      quoteCurrencies
    )
    const rates: GQLExchangeRate[] = []
    for (const t of tokenCurrencies) {
      for (const q of quoteCurrencies) {
        rates.push(this.parseCoingeckoData(data, { from: t, to: q }))
      }
    }
    return rates
  }

  private fetchFiatRates = async (): Promise<GQLExchangeRate[]> => {
    const rates: GQLExchangeRate[] = []
    for (const f of fiatCurrencies) {
      const data = await this.requestExchangeRatesDataAPI(f, quoteCurrencies)
      for (const q of quoteCurrencies) {
        rates.push(this.parseExchangeRateData(data, { from: f, to: q }))
      }
    }
    return rates
  }

  private parseCoingeckoData = (
    data: any,
    pair: { from: TokenCurrency; to: GQLQuoteCurrency }
  ): GQLExchangeRate => ({
    from: pair.from,
    to: pair.to,
    rate: data[TOKEN_TO_COINGECKO_ID[pair.from]][pair.to.toLowerCase()],
    updatedAt: new Date(
      data[TOKEN_TO_COINGECKO_ID[pair.from]].last_updated_at * 1000
    ),
  })

  private parseExchangeRateData = (data: any, pair: Pair): GQLExchangeRate => ({
    from: pair.from,
    to: pair.to,
    rate: data.rates[pair.to],
    updatedAt: new Date(data.timestamp * 1000),
  })

  private requestCoingeckoAPI = async (
    bases: TokenCurrency[],
    quotes: GQLQuoteCurrency[]
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
    } catch (error) {
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
    quotes: GQLQuoteCurrency[]
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
    } catch (error) {
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
