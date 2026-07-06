import type { GQLResolvers } from '#definitions/index.js'

import { NODE_TYPES, USER_STATE } from '#common/enums/index.js'
import { ArticleNotFoundError } from '#common/errors.js'
import { toGlobalId } from '#common/utils/index.js'

const restrictedAuthorStates = new Set<string>([
  USER_STATE.frozen,
  USER_STATE.banned,
  USER_STATE.archived,
])

const schema: GQLResolvers = {
  Quote: {
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.Quote, id }),
    // defense in depth: even if a quote row slips through list-level filters,
    // do not resolve the article of a restricted author (mirrors Query.node)
    article: async (
      { articleId },
      _,
      { viewer, dataSources: { atomService } }
    ) => {
      const article = await atomService.articleIdLoader.load(articleId)
      if (viewer.id !== article.authorId && !viewer.hasRole('admin')) {
        const author = await atomService.userIdLoader.load(article.authorId)
        if (author && restrictedAuthorStates.has(author.state)) {
          throw new ArticleNotFoundError('target article does not exists')
        }
      }
      return article
    },
    poster: ({ userId }, _, { dataSources: { atomService } }) =>
      atomService.userIdLoader.load(userId),
    createdAt: ({ createdAt }) => createdAt,
  },
}

export default schema
