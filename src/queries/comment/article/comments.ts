import { toGlobalId } from 'common/utils'

import { ArticleToCommentsResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'
import { COMMENT_STATE } from 'common/enums'

const resolver: ArticleToCommentsResolver = async (
  { id },
  { input: { sort, first, ...rest } },
  { dataSources: { commentService } }
) => {
  // resolve sort to order
  const order = sort === 'oldest' ? 'asc' : 'desc'

  // set default for first in forward pagination. use 0 for query all.
  // TODO: use "last" for backward pagination
  if (!rest.before && typeof first === 'undefined') {
    first = 10
  }

  // handle pagination
  let before, after
  if (rest.after) {
    after = fromGlobalId(rest.after).id
  }
  if (rest.before) {
    before = fromGlobalId(rest.before).id
  }

  // handle filter
  let filter = { articleId: id } as { [key: string]: any }
  if (rest.filter) {
    const { parentComment, author, state } = rest.filter
    if (parentComment || parentComment === null) {
      filter = {
        parentCommentId: parentComment ? fromGlobalId(parentComment).id : null,
        ...filter
      }
    }
    if (author) {
      filter = {
        authorId: fromGlobalId(author).id,
        state: COMMENT_STATE.active, // will be overwrite by sate in input if specified
        ...filter
      }
    }
    if (state) {
      filter = {
        state,
        ...filter
      }
    }
  }

  const [comments, range] = await Promise.all([
    commentService.find({
      sort,
      before,
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
