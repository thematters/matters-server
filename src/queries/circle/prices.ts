import { CircleToPricesResolver } from 'definitions'

const resolver: CircleToPricesResolver = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  if (!id) {
    return []
  }

  const prices = await atomService.findMany({
    table: 'circle_price',
    where: {
      circle_id: id,
      state: 'active',
    },
  })
  return prices
}

export default resolver
