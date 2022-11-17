import { exchangeRate } from 'connectors'
import { GQLQuoteCurrency, GQLTransactionCurrency } from 'definitions'

export default {
  Query: {
    exchangeRates: (
      _: any,
      {
        input: { to, from },
      }: { input: { to?: GQLQuoteCurrency; from?: GQLTransactionCurrency } }
    ) => {
      return exchangeRate.getRates(from, to)
    },
  },
}
