import { ExchangeRate } from 'connectors'
import { GQLQuoteCurrency, GQLTransactionCurrency } from 'definitions'

export default {
  Query: {
    exchangeRates: (
      _: any,
      {
        input: { to, from },
      }: { input: { to?: GQLQuoteCurrency; from?: GQLTransactionCurrency } }
    ) => {
      const exchangeRate = new ExchangeRate()
      return exchangeRate.getRates(from, to)
    },
  },
}
