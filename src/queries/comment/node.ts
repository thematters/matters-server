import { CommentToNodeResolver } from 'definitions'

const resolver: CommentToNodeResolver = async (
  { id, targetId, targetEntityId },
  _,
  { dataSources: { atomService } }
) => {
  if (!id) {
    return null
  }

  const record = await atomService.findUnique({
    table: 'entity_type',
    where: { id: targetEntityId },
  })

  if (!record) {
    return null
  }

  const node = await atomService.findUnique({
    table: record.table,
    where: { id: targetId },
  })

  return node
}

export default resolver
