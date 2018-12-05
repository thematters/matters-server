import { Resolver } from 'src/definitions'

const resolver: Resolver = async (
  root,
  { input: { uuid } },
  { viewer, articleService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  const article = await articleService.uuidLoader.load(uuid)
  if (!article) {
    throw new Error('target article does not exists') // TODO
  }

  const readRecords = await articleService.findReadByArticleIdAndUserId(
    article.id,
    viewer.id
  )

  if (readRecords.length <= 0) {
    articleService.read(article.id, viewer.id)
  }

  return true
}

export default resolver
