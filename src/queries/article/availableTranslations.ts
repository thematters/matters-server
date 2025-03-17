import type { GQLArticleResolvers, LANGUAGES } from '#definitions/index.js'

import { LANGUAGE } from '#common/enums/index.js'

const resolver: GQLArticleResolvers['availableTranslations'] = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  const validLanguages = [LANGUAGE.en, LANGUAGE.zh_hans, LANGUAGE.zh_hant]

  const languages = (
    await atomService.findMany({
      table: 'article_translation',
      select: ['language'],
      where: { articleId: id },
    })
  )
    .map((t) => t.language)
    .filter((l) => validLanguages.includes(l as LANGUAGES))

  return languages as LANGUAGES[]
}

export default resolver
