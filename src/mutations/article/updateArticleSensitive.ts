import type { GQLMutationResolvers } from 'definitions'

import { ArticleNotFoundError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['updateArticleSensitive'] = async (
  _,
  { input: { id, sensitive } },
  { dataSources: { atomService } }
) => {
  const { id: dbId } = fromGlobalId(id)

  const article = await atomService.findUnique({
    table: 'article',
    where: { id: dbId },
  })
  if (!article) {
    throw new ArticleNotFoundError('article does not exist')
  }

  const updated = await atomService.update({
    data: {
      sensitiveByAdmin: sensitive,
    },
    table: 'article',
    where: { id: dbId },
  })

  return updated
}

export default resolver
