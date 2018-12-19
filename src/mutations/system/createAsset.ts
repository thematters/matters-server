import { v4 } from 'uuid'
import { ItemData, Resolver } from 'definitions'

const resolver: Resolver = async (
  _,
  { input: { type, path } },
  { viewer, assetService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this')
  }

  const data: ItemData = {
    uuid: v4(),
    authorId: viewer.id,
    type,
    path
  }
  return await assetService.baseCreate(data)
}

export default resolver
