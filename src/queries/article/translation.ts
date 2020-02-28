import { CACHE_PREFIX, CACHE_TTL } from 'common/enums'
import { CacheService } from 'connectors'
import { GQLArticleTranslationTypeResolver } from 'definitions'

import contentResolver from './content'

const type = 'ArticleTranslation'

const cacheService = new CacheService(undefined, CACHE_PREFIX.OBJECTS)

const resolver: GQLArticleTranslationTypeResolver = {
  originalLanguage: async (
    { content, id },
    _,
    { dataSources: { articleService } }
  ) =>
    cacheService.getObject({
      type,
      id,
      field: 'originalLanguage',
      getter: () => articleService.detectLanguage(content),
      expire: CACHE_TTL.STATIC
    }),

  title: async (
    { title, id },
    _,
    { dataSources: { articleService }, viewer: { language } }
  ) =>
    cacheService.getObject({
      type,
      id,
      field: 'title',
      args: JSON.stringify({ language }),
      getter: () => articleService.translate(title, language),
      expire: CACHE_TTL.STATIC,
      fallbackValue: title
    }),

  content: async (...args) => {
    // for ACL
    const content = contentResolver(...args)
    if (content) {
      const [
        { id },
        _,
        {
          dataSources: { articleService },
          viewer: { language }
        }
      ] = args

      return cacheService.getObject({
        type,
        id,
        field: 'content',
        args: JSON.stringify({ language }),
        getter: () => articleService.translate(content, language),
        expire: CACHE_TTL.STATIC,
        fallbackValue: content
      })
    } else {
      return ''
    }
  }
}

export default resolver
