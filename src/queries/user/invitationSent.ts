import { Resolver, BatchParams, Context } from 'definitions'

const resolver: Resolver = async (
  { id }: { id: string },
  { input: { offset, limit } }: BatchParams,
  { dataSources: { userService } }: Context
) => {
  const invitations = await userService.findInvitations({
    userId: id,
    offset,
    limit
  })
  return invitations
}

export default resolver
