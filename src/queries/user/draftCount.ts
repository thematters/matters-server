import { UserStatusToDraftCountResolver } from 'definitions'

const resolver: UserStatusToDraftCountResolver = async (
  { id },
  _,
  { dataSources: { draftService } }
) => draftService.countByAuthor(id)

export default resolver
