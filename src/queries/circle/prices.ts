import type { GQLCircleResolvers } from 'definitions'

const resolver: GQLCircleResolvers['prices'] = async (
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
