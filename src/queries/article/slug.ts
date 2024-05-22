import type { GQLArticleResolvers } from 'definitions'

import slugify from '@matters/slugify'

const resolver: GQLArticleResolvers['slug'] = async (
  { id },
  _,
  { dataSources: { articleService } }
) => {
  const articleVersion = await articleService.loadLatestArticleVersion(id)
  return slugify(articleVersion.title || '')
}

export default resolver
