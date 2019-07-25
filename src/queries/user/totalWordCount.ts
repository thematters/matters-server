import { UserInfoToTotalWordCountResolver } from 'definitions'

const resolver: UserInfoToTotalWordCountResolver = async (
  { id },
  _,
  { dataSources: { articleService } }
) => articleService.sumWordCountByAuthor(id)

export default resolver
