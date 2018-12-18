import { Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = async (
  root,
  { input: { id } },
  { viewer, articleService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this') // TODO
  }
  const { id: dbID } = fromGlobalId(id)
  const article = await articleService.idLoader.load(dbID)
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
