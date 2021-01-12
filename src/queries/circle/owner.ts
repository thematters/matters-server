import { CircleToOwnerResolver } from 'definitions'

const resolver: CircleToOwnerResolver = async (
  { owner },
  _,
  { dataSources: { atomService } }
) => atomService.userIdLoader.load(owner)

export default resolver
