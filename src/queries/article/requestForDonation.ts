import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['requestForDonation'] = async (
  { id: articleId },
  _,
  { dataSources: { articleService } }
) => {
  const { requestForDonation } = await articleService.loadLatestArticleVersion(
    articleId
  )
  return requestForDonation
}

export default resolver
