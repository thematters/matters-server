import type { GQLTagResolvers } from '#definitions/index.js'

const resolver: GQLTagResolvers['numArticles'] = async (
  { id }: any,
  _,
  { dataSources: { tagService } }
) => {
  return tagService.countArticles({ id })
}

export default resolver
