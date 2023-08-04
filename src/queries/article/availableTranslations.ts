import type { GQLArticleResolvers } from 'definitions'

import { LANGUAGE } from 'common/enums'

const resolver: GQLArticleResolvers['availableTranslations'] = async (
  { articleId },
  _,
  { dataSources: { atomService } }
) => {
  const validLanguages = [LANGUAGE.en, LANGUAGE.zh_hans, LANGUAGE.zh_hant]

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
