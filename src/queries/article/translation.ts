import { ArticleToTranslationResolver } from 'definitions'

const resolver: ArticleToTranslationResolver = (
  { content, title },
  { input },
  { dataSources: { articleService }, viewer }
) => ({
  // deprecated
  originalLanguage: () => articleService.detectLanguage(content),

  title: () =>
    articleService.translate({
      content: title,
      target: input ? input.language : viewer.language,
    }),

  content: () =>
    articleService.translate({
      content,
      target: input ? input.language : viewer.language,
    }),
})

export default resolver
