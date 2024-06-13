import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['drafts'] = async (
  { id: articleId },
  _,
  { dataSources: { atomService } }
) =>
  atomService.findMany({
    table: 'draft',
    where: { articleId },
    orderBy: [{ column: 'created_at', order: 'desc' }],
  })

export default resolver
