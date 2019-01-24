import { MutationToUpdateArticleStateResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToUpdateArticleStateResolver = async (
  _,
  { input: { id, state } },
  { viewer, dataSources: { articleService } }
) => {
  const { id: dbId } = fromGlobalId(id)

  // TODO: trigger notification

  return await articleService.baseUpdate(dbId, { state, updatedAt: new Date() })
}

export default resolver
