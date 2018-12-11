import { BatchParams, Context } from 'definitions'

export default {
  Query: {
    article: (
      _: any,
      { uuid }: { uuid: string },
      { articleService }: Context
    ) => articleService.uuidLoader.load(uuid)
  },
  User: {
    articles: (
      { id }: { id: number },
      { input: { offset, limit } }: BatchParams,
      { articleService }: Context
    ) => articleService.findByAuthorInBatch(id, offset, limit)
  },
  UserStatus: {
    MAT: async (
      { id }: { id: number },
      _: any,
      { articleService }: Context
    ) => {
      const articles = await articleService.findByAuthor(id)
      const apprecitions = ((await Promise.all(
        articles.map(
          async ({ id }: { id: number }) =>
            await articleService.countAppreciation(id)
        )
      )) as unknown) as number[]
      return apprecitions.reduce((a: number, b: number): number => a + b, 0)
    }
  },
  Article: {
    author: ({ id }: { id: number }, _: any, { userService }: Context) =>
      userService.idLoader.load(id),
    summary: (
      { hash }: { hash: string },
      _: any,
      { articleService }: Context
    ) => articleService.getContentFromHash(hash).slice(0, 30),
    tags: async (
      { id }: { id: number },
      _: any,
      { articleService }: Context
    ) => {
      const tags = await articleService.findTags(id)
      return tags.map((t: any) => ({ text: t.tag }))
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
      { upstreamId }: { upstreamId: number },
      _: any,
      { articleService }: Context
    ) => articleService.idLoader.load(upstreamId),
    downstreams: (
      { id }: { id: number },
      _: any,
      { articleService }: Context
    ) => articleService.findByUpstream(id),
    relatedArticles: () => [], // placeholder for recommendation engine
    MAT: ({ mat }: { mat: number }) => mat,
    subscribed: () => false,
    subscribers: async (
      { id }: { id: number },
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
      { id }: { id: number },
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
    count: (
      { text }: { text: string },
      _: any,
      { articleService }: Context
    ) => {
      return articleService.countByTag(text)
    },
    articles: (
      { text }: { text: string },
      _: any,
      { articleService }: Context
    ) => {
      return articleService.findByTag(text)
    }
  }
}
