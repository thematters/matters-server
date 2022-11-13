export default {
  Query: {
    exchangeRates: (
      _: any,
      { input: { to, from } }: { input: { to: string; from: string } }
    ) => {
      const allRates = [
        {
          from: 'HKD',
          to: 'TWD',
          rate: 4.04,
          updatedAt: new Date(),
        },
        {
          from: 'LIKE',
          to: 'TWD',
          rate: 0.085,
          updatedAt: new Date(),
        },
        {
          from: 'USDT',
          to: 'TWD',
          rate: 31.84,
          updatedAt: new Date(),
        },
        {
          from: 'HKD',
          to: 'HKD',
          rate: 1,
          updatedAt: new Date(),
        },
        {
          from: 'LIKE',
          to: 'HKD',
          rate: 0.020092,
          updatedAt: new Date(),
        },
        {
          from: 'USDT',
          to: 'HKD',
          rate: 7.83,
          updatedAt: new Date(),
        },
        {
          from: 'HKD',
          to: 'USD',
          rate: 0.127596,
          updatedAt: new Date(),
        },
        {
          from: 'LIKE',
          to: 'USD',
          rate: 0.002566,
          updatedAt: new Date(),
        },
        {
          from: 'USDT',
          to: 'USD',
          rate: 1,
          updatedAt: new Date(),
        },
      ]
      let rates = allRates

      if (to) {
        rates = rates.filter((rate) => rate.to === to)
      }

      if (from) {
        rates = rates.filter((rate) => rate.from === from)
      }

      return rates
    },
  },
}
