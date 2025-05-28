import type { GQLArticleResolvers } from '#definitions/index.js'

const resolver: GQLArticleResolvers['classification'] = async (
  root,
  _,
  { viewer }
) => {
  if (viewer.hasRole('admin')) {
    return root
  }

  if (viewer.id !== root.authorId) {
    return null
  }

  return root
}

export default resolver
