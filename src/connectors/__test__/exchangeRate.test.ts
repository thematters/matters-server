import { CacheService, ExchangeRate } from 'connectors'

//// stubs
// {
//    "likecoin": {
//          "hkd": 0.01919234,
//            "twd": 0.07643,
//            "usd": 0.0024524,
//            "last_updated_at": 1668738838
//        },
//      "tether": {
//            "hkd": 7.82,
//              "twd": 31.15,
//              "usd": 0.999504,
//              "last_updated_at": 1668738623
//          }
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
    // mock
    exchangeRate.expire = 10
    exchangeRate.cache = new CacheService('testExchangeRate')
  })
  test('test', async () => {
    await exchangeRate.updateTokenRates()
    const res = await exchangeRate.getRates()
    console.log(res)
  })
})
