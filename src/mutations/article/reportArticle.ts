import { Resolver } from 'definitions'

const resolver: Resolver = async (
  root,
  { input: { uuid, category, description } },
  { viewer, articleService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  const article = await articleService.uuidLoader.load(uuid)
  if (!article) {
    throw new Error('target article does not exists') // TODO
  }

  articleService.report(article.id, viewer.id, category, description)

  return true
}

export default resolver
