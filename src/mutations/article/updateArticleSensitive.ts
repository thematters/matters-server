import { fromGlobalId } from 'common/utils'
import { MutationToUpdateArticleSensitiveResolver } from 'definitions'

const resolver: MutationToUpdateArticleSensitiveResolver = async (
  _,
  { input: { id, sensitive } },
  { viewer, dataSources: { articleService, draftService } }
) => {
  const { id: dbId } = fromGlobalId(id)

  const article = await articleService.baseUpdate(dbId, {
    sensitiveByAdmin: sensitive,
    updatedAt: new Date(),
  })

  const node = await draftService.baseFindById(article.draftId)
  return node
}

export default resolver
