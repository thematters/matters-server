import { fromGlobalId } from 'common/utils/index.js'
import { MutationToClearReadHistoryResolver } from 'definitions'

const resolver: MutationToClearReadHistoryResolver = async (
  _,
  { input: { id } },
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    return true
  }

  await userService.clearReadHistory({
    articleId: fromGlobalId(id).id,
    userId: viewer.id,
  })

  return true
}

export default resolver
