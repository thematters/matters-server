import { Resolver } from 'definitions'

const resolver: Resolver = ({ id }, _, { viewer, articleService }) => {
  if (!viewer) {
    return false
  }

  return articleService.hasAppreciate({
    userId: viewer.id,
    articleId: id
  })
}

export default resolver
