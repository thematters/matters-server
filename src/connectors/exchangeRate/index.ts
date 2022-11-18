import { CACHE_TTL } from 'common/enums'
import { UnknownError } from 'common/errors'
import logger from 'common/logger'
import { CacheService } from 'connectors'
import {
  GQLExchangeRate,
  GQLQuoteCurrency,
  GQLTransactionCurrency,
} from 'definitions'

interface Pair {
  from: GQLTransactionCurrency
  to: GQLQuoteCurrency
}

type TokenCurrency = GQLTransactionCurrency.LIKE | GQLTransactionCurrency.USDT
type FiatCurrency = GQLTransactionCurrency.HKD

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
      getter: async () => this.updateAllRatesAndGetRate(pair),
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

  private updateAllRatesAndGetRate = async ({
    from,
    to,
  }: Pair): Promise<GQLExchangeRate | never> => {
    logger.warn(
      'exchangeRate requested APIs to get rates instead of from cache'
    )
    const tokenRates = await this.fetchTokenRates()
    const fiatRates = await this.fetchFiatRates()
    await this.updateRatesToCache(tokenRates)
    await this.updateRatesToCache(fiatRates)
    for (const rate of tokenRates) {
      if (rate.from === from && rate.to === to) {
        return rate
      }
    }
    for (const rate of fiatRates) {
      if (rate.from === from && rate.to === to) {
        return rate
      }
    }
    throw new UnknownError('Unexpected missing return value')
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
        rates.push({
          from: t,
          to: q,
          rate: data[TOKEN_TO_COINGECKO_ID[t]][q.toLowerCase()],
          updatedAt: new Date(
            data[TOKEN_TO_COINGECKO_ID[t]].last_updated_at * 1000
          ),
        })
      }
    }
    return rates
  }

  private fetchFiatRates = async (): Promise<GQLExchangeRate[]> => {
    const rates: GQLExchangeRate[] = []
    for (const t of fiatCurrencies) {
      const data = await this.requestExchangeRatesDataAPI(t, quoteCurrencies)
      for (const q of quoteCurrencies) {
        rates.push({
          from: t,
          to: q,
          rate: data.rates[q],
          updatedAt: new Date(data.timestamp * 1000),
        })
      }
    }
    return rates
  }

  private requestCoingeckoAPI = async (
    bases: TokenCurrency[],
    quotes: GQLQuoteCurrency[]
  ): Promise<any | never> => {
    return {
      likecoin: {
        hkd: 0.01919234,
        twd: 0.07643,
        usd: 0.0024524,
        last_updated_at: 1668738838,
      },
      tether: {
        hkd: 7.82,
        twd: 31.15,
        usd: 0.999504,
        last_updated_at: 1668738623,
      },
    }
  }

  private requestExchangeRatesDataAPI = async (
    base: FiatCurrency,
    quotes: GQLQuoteCurrency[]
  ): Promise<any | never> => {
    // if not success raise
    return {
      base: 'HKD',
      date: '2022-11-18',
      rates: {
        HKD: 1,
        TWD: 3.982979,
        USD: 0.127826,
      },
      success: true,
      timestamp: 1668752883,
    }
  }
}
