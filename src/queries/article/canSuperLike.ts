import type { GQLArticleResolvers } from '#definitions/index.js'

// TODO: deprecated
const resolver: GQLArticleResolvers['canSuperLike'] = async (
  { id },
  _,
  { viewer, dataSources: { userService } }
) => {
  return false
}

export default resolver
