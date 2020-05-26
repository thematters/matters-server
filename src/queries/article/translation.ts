import { GQLArticleTranslationTypeResolver } from 'definitions'

const resolver: GQLArticleTranslationTypeResolver = {
  originalLanguage: async (
    { content },
    _,
    { dataSources: { articleService } }
  ) => articleService.detectLanguage(content),

  title: async (
    { title },
    _,
    { dataSources: { articleService }, viewer: { language } }
  ) => articleService.translate({ content: title, target: language }),

  content: async (
    { content },
    _,
    { dataSources: { articleService }, viewer: { language } }
  ) => articleService.translate({ content, target: language }),
}

export default resolver
