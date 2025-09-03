import type { GQLTagResolvers } from '#definitions/index.js'

const resolver: GQLTagResolvers['numArticles'] = async (
  { id },
  _,
  { dataSources: { tagService } }
) => {
  return tagService.countArticles({ id })
}

export default resolver
