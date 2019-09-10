import { toGlobalId } from 'common/utils'

import { ArticleToFeaturedCommentsResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: ArticleToFeaturedCommentsResolver = async (
  { id },
  { input: { sort, first, after } },
  { dataSources: { commentService } }
) => {
  // resolve sort to order
  const order = sort === 'oldest' ? 'asc' : 'desc'

  // handle pagination
  if (after) {
    after = fromGlobalId(after).id
  }

  // handle filter
  const filter = { articleId: id } as { [key: string]: any }
  const [comments, range] = await Promise.all([
    commentService.find({
      sort,
      after,
      first,
      filter,
      order
    }),
    commentService.range(filter)
  ])

  const edges = comments.map((comment: { [key: string]: string }) => ({
    cursor: toGlobalId({ type: 'Comment', id: comment.id }),
    node: comment
  }))

  const firstEdge = edges[0]
  const firstId = firstEdge && parseInt(firstEdge.node.id, 10)

  const lastEdge = edges[edges.length - 1]
  const lastId = lastEdge && parseInt(lastEdge.node.id, 10)

  return {
    edges,
    totalCount: range.count,
    pageInfo: {
      startCursor: firstEdge ? firstEdge.cursor : '',
      endCursor: lastEdge ? lastEdge.cursor : '',
      hasPreviousPage:
        order === 'asc' ? firstId > range.min : firstId < range.max,
      hasNextPage: order === 'asc' ? lastId < range.max : lastId > range.min
    }
  }
}

export default resolver
