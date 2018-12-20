import { Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = async (
  root,
  { input: { id, category, description } },
  { viewer, articleService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this') // TODO
  }
  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.idLoader.load(dbId)
  if (!article) {
    throw new Error('target article does not exists') // TODO
  }

  articleService.report(article.id, viewer.id, category, description)

  return true
}

export default resolver
