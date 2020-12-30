import {
  AuthenticationError,
  EntityNotFoundError,
  UserInputError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToToggleCircleMemberResolver } from 'definitions'

const resolver: MutationToToggleCircleMemberResolver = async (
  root,
  { input: { id, enabled, targetId } },
  { viewer, dataSources: { atomService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }
  if (typeof enabled !== 'boolean') {
    throw new UserInputError('parameter "enabled" is required')
  }

  const { id: circleId } = fromGlobalId(id || '')
  const circle = await atomService.findUnique({
    table: 'circle',
    where: { id: circleId },
  })

  if (!circle) {
    throw new EntityNotFoundError(`circle ${circleId} not found`)
  }

  // TODO: add or remove circle member

  return circle
}

export default resolver
