import { ExchangeRate } from '#connectors/exchangeRate/index.js'

import { connections } from '../connections.js'

type ExchangeRateEvent = {
  data: {
    type: 'token' | 'fiat'
  }
}

const exchangeRate = new ExchangeRate(connections.objectCacheRedis)

export const handler = async (event: ExchangeRateEvent) => {
  if (event.data.type === 'token') {
    await exchangeRate.updateTokenRates()
  } else {
    await exchangeRate.updateFiatRates()
  }
}
