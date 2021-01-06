import { QueryToCircleResolver } from 'definitions'

const resolver: QueryToCircleResolver = async (
  root,
  { input: { name } },
  { dataSources: { atomService } }
) => {
  if (!name) {
    return
  }

  const circle = await atomService.findFirst({
    table: 'circle',
    where: { name },
  })

  return circle
}

export default resolver
