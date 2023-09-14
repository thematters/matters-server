import type { GQLResolvers } from 'definitions'

const exchangeRates: GQLResolvers = {
  Query: {
    exchangeRates: (_, { input }, { dataSources: { exchangeRate } }) => {
      if (input) {
        return exchangeRate.getRates(input.from, input.to)
      } else {
        return exchangeRate.getRates()
      }
    },
  },
}

export default exchangeRates
