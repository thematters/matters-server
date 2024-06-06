import type { GQLMutationResolvers } from 'definitions'

import { ArticleNotFoundError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['toggleArticleRecommend'] = async (
  _,
  { input: { id, enabled, type = 'icymi' } },
  { dataSources: { atomService } }
) => {
  const { id: dbId } = fromGlobalId(id)
  const article = await atomService.articleIdLoader.load(dbId)
  if (!article) {
    throw new ArticleNotFoundError('target article does not exists')
  }

  switch (type) {
    case 'icymi': {
      if (enabled) {
        const data = { articleId: dbId }
        await atomService.upsert({
          table: 'matters_choice',
          where: data,
          create: data,
          update: data,
        })
      } else {
        await atomService.deleteMany({
          table: 'matters_choice',
          where: { articleId: dbId },
        })
      }
      break
    }
    case 'hottest': {
      await atomService.upsert({
        table: 'article_recommend_setting',
        where: { articleId: dbId },
        create: { inHottest: enabled, articleId: dbId },
        update: { inHottest: enabled },
      })
      break
    }
    case 'newest': {
      await atomService.upsert({
        table: 'article_recommend_setting',
        where: { articleId: dbId },
        create: { inNewest: enabled, articleId: dbId },
        update: { inNewest: enabled },
      })
      break
    }
    case 'search': {
      await atomService.upsert({
        table: 'article_recommend_setting',
        where: { articleId: dbId },
        create: { inSearch: enabled, articleId: dbId },
        update: { inSearch: enabled },
      })
      break
    }
  }
  return article
}

export default resolver
