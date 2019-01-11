import { connectionFromPromisedArray } from 'graphql-relay'

import { ArticleToCommentsResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: ArticleToCommentsResolver = (
  { id },
  { input: { author, quote, sort, ...connectionArgs } },
  { dataSources: { commentService } }
) => {
  if (author) {
    const { id: authorId } = fromGlobalId(author)
    author = authorId
  }

  return connectionFromPromisedArray(
    commentService.findByArticle({ id, author, quote, sort }),
    connectionArgs
  )
}

export default resolver
