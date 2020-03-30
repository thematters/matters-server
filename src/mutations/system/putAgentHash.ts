import { EntityNotFoundError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToPutAgentHashResolver } from 'definitions'

const resolver: MutationToPutAgentHashResolver = async (
  root,
  { input: { id, type, value } },
  { viewer, dataSources: { systemService } }
) => {
  const { id: dbId } = fromGlobalId(id)
  const entity = await systemService.dataloader.load(dbId)
  if (!entity) {
    throw new EntityNotFoundError(`target ${type} does not exists`)
  }

  // TODO: update

  return true
}

export default resolver
