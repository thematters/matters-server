import { Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = async (
  root,
  { input: { id, amount } },
  { viewer, articleService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  if (viewer.mat < amount) {
    throw new Error('not enough MAT to appreciate') // TODO
  }
  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.idLoader.load(dbId)
  if (!article) {
    throw new Error('target article does not exists') // TODO
  }

  articleService.appreciate(article.id, viewer.id, amount, viewer.mat)

  return true
}

export default resolver
