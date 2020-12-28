import { UserToOwnerOfResolver } from 'definitions'

const resolver: UserToOwnerOfResolver = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  if (!id) {
    return []
  }

  const circles = await atomService.findMany({
    table: 'circle',
    where: { owner: id },
  })

  return circles
}

export default resolver
