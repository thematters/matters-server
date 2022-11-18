import { CacheService, ExchangeRate } from 'connectors'

//// stubs
// const mockTokenRates = async () => {
//  return [
//    {
//      from: 'LIKE',
//      to: 'TWD',
//      rate: 0.085,
//      updatedAt: new Date(),
//    },
//    {
//      from: 'USDT',
//      to: 'TWD',
//      rate: 31.84,
//      updatedAt: new Date(),
//    },
//    {
//      from: 'LIKE',
//      to: 'HKD',
//      rate: 0.020092,
//      updatedAt: new Date(),
//    },
//    {
//      from: 'USDT',
//      to: 'HKD',
//      rate: 7.83,
//      updatedAt: new Date(),
//    },
//    {
//      from: 'LIKE',
//      to: 'USD',
//      rate: 0.002566,
//      updatedAt: new Date(),
//    },
//    {
//      from: 'USDT',
//      to: 'USD',
//      rate: 1,
//      updatedAt: new Date(),
//    },
//  ]
// }
// const mockFetchFiatRates = async () => {
//  return [
//    {
//      from: 'HKD',
//      to: 'TWD',
//      rate: 4.04,
//      updatedAt: new Date(),
//    },
//    {
//      from: 'HKD',
//      to: 'HKD',
//      rate: 1,
//      updatedAt: new Date(),
//    },
//    {
//      from: 'HKD',
//      to: 'USD',
//      rate: 0.127596,
//      updatedAt: new Date(),
//    },
//  ]
// }
//
// const mockFetchRate = async ({ from, to }: Pair) => {
//  return {
//    from,
//    to,
//    rate: 1,
//    updatedAt: new Date(),
//  }
// }

describe('exchangeRate', () => {
  const exchangeRate = new ExchangeRate()
  beforeAll(() => {
    exchangeRate.expire = 10
    exchangeRate.cache = new CacheService('testExchangeRate')
  })
  test('test', async () => {
    await exchangeRate.updateFiatRates()
    const res = await exchangeRate.getRates()
    console.log(res)
  })
})
