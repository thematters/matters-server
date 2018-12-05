import { Resolver } from 'src/definitions'

const resolver: Resolver = async (
  root,
  { input: { uuid, amount } },
  { viewer, articleService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  if (viewer.mat < amount) {
    throw new Error('not enough MAT to appreciate') // TODO
  }

  const article = await articleService.uuidLoader.load(uuid)
  if (!article) {
    throw new Error('target article does not exists') // TODO
  }

  articleService.appreciate(article.id, viewer.id, amount, viewer.mat)

  return true
}

export default resolver
