import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['revisionCount'] = async (
  { articleId },
  _,
  { dataSources: { atomService } }
) => {
  const result = await atomService.findFirst({
    table: 'article_read_time_materialized',
    where: { articleId },
  })

  if (!result) {
    return 0
  }

  const sumReadTime = parseFloat(result.sumReadTime)

  if (!sumReadTime || sumReadTime <= 0) {
    return 0
  }

  return sumReadTime
}

export default resolver
