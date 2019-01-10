import { Resolver } from 'definitions'

const resolver: Resolver = async (
  { id },
  _,
  { viewer, dataSources: { articleService } }
) => {
  if (!viewer.id) {
    return 0
  }

  return articleService.appreciateLeftByUser({
    articleId: id,
    userId: viewer.id
  })
}

export default resolver
