import { Context } from 'src/definitions'

import article from './rootArticle'
import MAT from './MAT'
import author from './author'
import content from './content'
import wordCount from './wordCount'
import upstream from './upstream'
import downstreams from './downstreams'
import relatedArticles from './relatedArticles'
import subscribers from './subscribers'
import commentCount from './commentCount'
import comments from './comments'
import pinnedComments from './pinnedComments'

export default {
  Query: {
    article
  },
  User: {
    articles: ({ id }: { id: number }, _: any, { articleService }: Context) =>
      articleService.findByAuthor(id)
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
    MAT,
    author,
    content,
    wordCount,
    upstream,
    downstreams,
    relatedArticles, // placeholder for recommendation engine
    subscribers,
    // appreciators: ({ appreciatorIds }, _, { userService }) =>
    // appreciatorIds.map((id: string) => userService.findById(id)),
    commentCount,
    comments,
    pinnedComments
  }
}
