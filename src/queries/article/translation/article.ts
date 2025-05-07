import type { GQLArticleResolvers } from '#definitions/index.js'

const resolver: GQLArticleResolvers['translation'] = async (
  { id: articleId },
  { input },
  { viewer, dataSources: { articleService } }
) => {
  const language = input && input.language ? input.language : viewer.language
  const articleVersion = await articleService.loadLatestArticleVersion(
    articleId
  )
  return articleService.getOrCreateTranslation(
    articleVersion,
    language,
    viewer.id,
    input?.model
  )
}
export default resolver
