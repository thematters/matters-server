import { Context } from 'src/definitions'

import article from './rootArticle'
import author from './author'
import cover from './cover'
import summary from './summary'
import tags from './tags'
import wordCount from './wordCount'
import content from './content'
import gatewayUrls from './gatewayUrls'
import upstream from './upstream'
import downstreams from './downstreams'
import relatedArticles from './relatedArticles'
import MAT from './MAT'
import commentCount from './commentCount'
import subscribed from './subscribed'
import pinnedComments from './pinnedComments'
import comments from './comments'
import subscribers from './subscribers'
import appreciators from './appreciators'
import hasAppreciate from './hasAppreciate'

export default {
  Query: {
    article
  },
  User: {
    articles: (
      { uuid }: { uuid: number },
      _: any,
      { articleService }: Context
    ) => articleService.findByAuthor(uuid)
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
    author,
    cover,
    summary,
    tags,
    wordCount,
    content,
    gatewayUrls,
    upstream,
    downstreams,
    relatedArticles, // placeholder for recommendation engine
    MAT,
    commentCount,
    subscribed,
    pinnedComments,
    comments,
    subscribers,
    appreciators,
    hasAppreciate
  }
}
