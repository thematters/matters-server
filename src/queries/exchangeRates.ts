import type { GQLResolvers } from '#definitions/index.js'

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
