import { Resolver } from 'definitions'

const resolver: Resolver = async (
  { status },
  _,
  { viewer, dataSources: { userService } }
) => status === 'activated'

export default resolver
