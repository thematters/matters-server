import { CacheService, ExchangeRate } from 'connectors'

// stub data

const coingeckoAPIData = {
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

const exchangeRatesDataAPIData = {
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

const rates = [
  {
    from: 'LIKE',
    to: 'TWD',
    rate: 0.07643,
    updatedAt: new Date('2022-11-18T02:33:58.000Z'),
  },
  {
    from: 'LIKE',
    to: 'HKD',
    rate: 0.01919234,
    updatedAt: new Date('2022-11-18T02:33:58.000Z'),
  },
  {
    from: 'LIKE',
    to: 'USD',
    rate: 0.0024524,
    updatedAt: new Date('2022-11-18T02:33:58.000Z'),
  },
  {
    from: 'USDT',
    to: 'TWD',
    rate: 31.15,
    updatedAt: new Date('2022-11-18T02:30:23.000Z'),
  },
  {
    from: 'USDT',
    to: 'HKD',
    rate: 7.82,
    updatedAt: new Date('2022-11-18T02:30:23.000Z'),
  },
  {
    from: 'USDT',
    to: 'USD',
    rate: 0.999504,
    updatedAt: new Date('2022-11-18T02:30:23.000Z'),
  },
  {
    from: 'HKD',
    to: 'TWD',
    rate: 3.982979,
    updatedAt: new Date('2022-11-18T06:28:03.000Z'),
  },
  {
    from: 'HKD',
    to: 'HKD',
    rate: 1,
    updatedAt: new Date('2022-11-18T06:28:03.000Z'),
  },
  {
    from: 'HKD',
    to: 'USD',
    rate: 0.127826,
    updatedAt: new Date('2022-11-18T06:28:03.000Z'),
  },
]

describe('exchangeRate', () => {
  const exchangeRate = new ExchangeRate()
  beforeEach(() => {
    // mock
    exchangeRate.expire = 3 // 3 seconds
    exchangeRate.cache = new CacheService('TestExchangeRate' + Math.random())
    // @ts-ignore
    exchangeRate.requestCoingeckoAPI = async () => coingeckoAPIData
    // @ts-ignore
    exchangeRate.requestExchangeRatesDataAPI = async () =>
      exchangeRatesDataAPIData
  })
  test('getRates not cached', async () => {
    expect(await exchangeRate.getRates()).toEqual(rates)
  })
  test('getRates cached', async () => {
    await exchangeRate.updateTokenRates()
    await exchangeRate.updateFiatRates()
    expect(await exchangeRate.getRates()).toEqual(rates)
  })
  test('call with args', async () => {
    const HKD = 'HKD' as any
    expect(await exchangeRate.getRates(HKD)).toEqual(
      rates.filter((r) => r.from === HKD)
    )
    expect(await exchangeRate.getRates(undefined, HKD)).toEqual(
      rates.filter((r) => r.to === HKD)
    )
    expect(await exchangeRate.getRates(HKD, HKD)).toEqual(
      rates.filter((r) => r.from === HKD && r.to === HKD)
    )
  })
  test('getRate', async () => {
    expect(await exchangeRate.getRate('HKD', 'USD')).toEqual(
      rates[rates.length - 1]
    )
  })
})
