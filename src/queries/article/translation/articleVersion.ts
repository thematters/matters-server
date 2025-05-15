import type { GQLArticleVersionResolvers } from '#definitions/index.js'

const resolver: GQLArticleVersionResolvers['translation'] = async (
  root,
  { input },
  { viewer, dataSources: { articleService } }
) => {
  const language = input && input.language ? input.language : viewer.language
  return articleService.getOrCreateTranslation(
    root,
    language,
    viewer.id,
    input?.model
  )
}

export default resolver
