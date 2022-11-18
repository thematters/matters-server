import { CACHE_TTL } from 'common/enums'
import { UnknownError } from 'common/errors'
import { CacheService } from 'connectors'
import {
  GQLExchangeRate,
  GQLQuoteCurrency,
  GQLTransactionCurrency,
} from 'definitions'

const TWD = 'TWD' as GQLQuoteCurrency
const HKD = 'HKD' as GQLQuoteCurrency
const USD = 'USD' as GQLQuoteCurrency

const LIKE = 'LIKE' as GQLTransactionCurrency
const USDT = 'USDT' as GQLTransactionCurrency
const HKD_ = 'HKD' as GQLTransactionCurrency

const quoteCurrencies: GQLQuoteCurrency[] = [TWD, HKD, USD]
const tokenCurrencies: GQLTransactionCurrency[] = [LIKE, USDT]
const fiatCurrencies: GQLTransactionCurrency[] = [HKD_]

interface Pair {
  from: GQLTransactionCurrency
  to: GQLQuoteCurrency
}

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
    const allPairs = this.getTokenPairs().concat(this.getFiatPairs())
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
    for (const rate of await this.fetchTokenRates()) {
      this.cache.storeObject({
        keys: this.genCacheKeys(rate),
        data: rate,
        expire: this.expire,
      })
    }
  }

  updateFiatRates = async () => {
    for (const rate of await this.fetchFiatRates()) {
      this.cache.storeObject({
        keys: this.genCacheKeys(rate),
        data: rate,
        expire: this.expire,
      })
    }
  }

  private getRate = async (pair: Pair): Promise<GQLExchangeRate | never> => {
    const data = await this.cache.getObject({
      keys: this.genCacheKeys(pair),
      getter: async () => this.fetchRate(pair),
      expire: this.expire,
    })
    if (!data) {
      throw new UnknownError('Unexpected null')
    }
    return data as unknown as GQLExchangeRate
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
    return [
      {
        from: LIKE,
        to: TWD,
        rate: 0.085,
        updatedAt: new Date(),
      },
      {
        from: USDT,
        to: TWD,
        rate: 31.84,
        updatedAt: new Date(),
      },
      {
        from: LIKE,
        to: HKD,
        rate: 0.020092,
        updatedAt: new Date(),
      },
      {
        from: USDT,
        to: HKD,
        rate: 7.83,
        updatedAt: new Date(),
      },
      {
        from: LIKE,
        to: USD,
        rate: 0.002566,
        updatedAt: new Date(),
      },
      {
        from: USDT,
        to: USD,
        rate: 1,
        updatedAt: new Date(),
      },
    ]
  }

  private fetchFiatRates = async (): Promise<GQLExchangeRate[]> => {
    return [
      {
        from: HKD_,
        to: TWD,
        rate: 4.04,
        updatedAt: new Date(),
      },
      {
        from: HKD_,
        to: HKD,
        rate: 1,
        updatedAt: new Date(),
      },
      {
        from: HKD_,
        to: USD,
        rate: 0.127596,
        updatedAt: new Date(),
      },
    ]
  }

  private fetchRate = async ({
    from,
    to,
  }: Pair): Promise<GQLExchangeRate | never> => {
    return {
      from,
      to,
      rate: 1,
      updatedAt: new Date(),
    }
  }
}
