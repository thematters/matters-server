import { ArticleToTranslationResolver } from 'definitions'

const resolver: ArticleToTranslationResolver = async (
  { content: originContent, title: originTitle },
  { input },
  { dataSources: { articleService }, viewer }
) => {
  const title = await articleService.translate({
    content: originTitle,
    target: input ? input.language : viewer.language,
  })

  const content = await articleService.translate({
    content: originContent,
    target: input ? input.language : viewer.language,
  })

  return title && content
    ? {
        // obsolete
        originLanguage: '',
        title,
        content,
      }
    : null
}
export default resolver
