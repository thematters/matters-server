import { AuthenticationError, ForbiddenError } from 'apollo-server'
import { MutationToSetTagBoostResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToSetTagBoostResolver = async (
  root,
  { input: { id, boost } },
  { viewer, dataSources: { tagService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (viewer.role !== 'admin') {
    throw new AuthenticationError('only admin can do this')
  }

  const { id: dbId } = fromGlobalId(id)
  const tag = await tagService.dataloader.load(dbId)
  if (!tag) {
    throw new ForbiddenError('target tag does not exists')
  }

  await tagService.setBoost({ tagId: dbId, boost })

  return tag
}

export default resolver
