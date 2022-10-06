import {
  ArticleToAvailableTranslationsResolver,
  GQLUserLanguage,
} from 'definitions'

const resolver: ArticleToAvailableTranslationsResolver = async (
  { articleId },
  _,
  { viewer, dataSources: { userService, atomService } }
) => {
  const validLanguages = [
    GQLUserLanguage.en,
    GQLUserLanguage.zh_hans,
    GQLUserLanguage.zh_hant,
  ]

  const languages = (
    await atomService.findMany({
      table: 'article_translation',
      select: ['language'],
      where: { articleId },
    })
  )
    .map((t) => t.language)
    .filter((l) => validLanguages.includes(l))

  return languages
}

export default resolver
