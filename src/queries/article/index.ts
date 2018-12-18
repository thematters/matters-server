import { BatchParams, Context } from 'definitions'
import { toGlobalId, fromGlobalId } from 'common/utils'

export default {
  User: {
    articles: (
      { id }: { id: string },
      { input: { offset, limit } }: BatchParams,
      { articleService }: Context
    ) => articleService.findByAuthorInBatch(id, offset, limit),
    article: (
      _: any,
      { input: { id } }: { input: { id: string } },
      { articleService }: Context
    ) => {
      const { id: dbId } = fromGlobalId(id)
      return articleService.idLoader.load(dbId)
    }
  },
  UserStatus: {
    MAT: async (
      { id }: { id: string },
      _: any,
      { articleService }: Context
    ) => {
      const articles = await articleService.findByAuthor(id)
      const apprecitions = ((await Promise.all(
        articles.map(
          async ({ id }: { id: string }) =>
            await articleService.countAppreciation(id)
        )
      )) as unknown) as number[]
      return apprecitions.reduce((a: number, b: number): number => a + b, 0)
    }
  },
  Article: {
    id: ({ id }: { id: string }) => {
      return toGlobalId({ type: 'Article', id })
    },
    author: ({ id }: { id: string }, _: any, { userService }: Context) =>
      userService.idLoader.load(id),
    summary: (
      { hash }: { hash: string },
      _: any,
      { articleService }: Context
    ) => articleService.getContentFromHash(hash).slice(0, 30),
    tags: async (
      { id }: { id: string },
      _: any,
      { articleService, tagService }: Context
    ) => {
      const tagIds = await articleService.findTagIds({ id })
      return tagService.idLoader.loadMany(tagIds)
    },
    wordCount: (
      { wordCount, hash }: { wordCount: number; hash: string },
      _: any,
      { articleService }: Context
    ) =>
      wordCount ||
      articleService.countWords(articleService.getContentFromHash(hash)),
    content: (
      { hash }: { hash: string },
      _: any,
      { articleService }: Context
    ) => articleService.getContentFromHash(hash),
    gatewayUrls: () => [],
    upstream: (
      { upstreamId }: { upstreamId: string },
      _: any,
      { articleService }: Context
    ) => articleService.idLoader.load(upstreamId),
    downstreams: (
      { id }: { id: string },
      _: any,
      { articleService }: Context
    ) => articleService.findByUpstream(id),
    relatedArticles: () => [], // placeholder for recommendation engine
    MAT: ({ mat }: { mat: number }) => mat,
    subscribed: () => false,
    subscribers: async (
      { id }: { id: string },
      { input: { offset, limit } }: BatchParams,
      { articleService, userService }: Context
    ) => {
      const actions = await articleService.findSubscriptionsInBatch(
        id,
        offset,
        limit
      )
      return userService.idLoader.loadMany(actions.map(({ userId }) => userId))
    },
    appreciators: async (
      { id }: { id: string },
      { input: { offset, limit } }: BatchParams,
      { articleService, userService }: Context
    ) => {
      const appreciators = await articleService.findAppreciatorsInBatch(
        id,
        offset,
        limit
      )
      return userService.idLoader.loadMany(
        appreciators.map(({ userId }) => userId)
      )
    },
    hasAppreciate: () => false
  },
  Tag: {
    id: ({ id }: { id: string }) => {
      return toGlobalId({ type: 'Tag', id })
    },
    count: ({ id }: { id: string }, _: any, { tagService }: Context) => {
      return tagService.countArticles({ id })
    },
    articles: async (
      { id }: { id: string },
      _: any,
      { tagService, articleService }: Context
    ) => {
      const articleIds = await tagService.findArticleIds({ id })
      return articleService.idLoader.loadMany(articleIds)
    }
  }
}
