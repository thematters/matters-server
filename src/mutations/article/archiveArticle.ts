import { AuthenticationError, ForbiddenError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToArchiveArticleResolver } from 'definitions'

const resolver: MutationToArchiveArticleResolver = async (
  _,
  { input: { id } },
  { viewer, dataSources: { articleService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id: dbId } = fromGlobalId(id)
  const { authorId } = await articleService.dataloader.load(dbId)

  if (authorId !== viewer.id) {
    throw new ForbiddenError('viewer has no permission')
  }

  const article = await articleService.archive(dbId)

  return article
}

export default resolver
