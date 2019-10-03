import { UserStatusToTotalWordCountResolver } from 'definitions'

const resolver: UserStatusToTotalWordCountResolver = async (
  { id },
  _,
  { dataSources: { articleService } }
) => articleService.sumWordCountByAuthor(id)

export default resolver
