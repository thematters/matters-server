import { GQLArticleTranslationTypeResolver } from 'definitions'

import contentResolver from './content'

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
  ) => articleService.translate(title, language),
  content: async (...args) => {
    // for ACL
    const content = contentResolver(...args)
    if (content) {
      const [
        root,
        _,
        {
          dataSources: { articleService },
          viewer: { language },
          redis
        }
      ] = args
      return articleService.translate(content, language)
    } else {
      return ''
    }
  }
}

export default resolver
