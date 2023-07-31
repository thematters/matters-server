import { type GQLArticleResolvers, GQLUserLanguage } from 'definitions'

const resolver: GQLArticleResolvers['availableTranslations'] = async (
  { articleId },
  _,
  { dataSources: { atomService } }
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
