import { connectionFromPromisedArray, toGlobalId } from 'common/utils'

import { ArticleToCommentsResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'
import { ForbiddenError } from 'common/errors'
import { COMMENT_STATE } from 'common/enums'

const resolver: ArticleToCommentsResolver = async (
  { id },
  { input: { author, sort, parent, first, ...rest } },
  { dataSources: { commentService } }
) => {
  // set default for first in forward pagination
  // TODO: use "last" for backward pagination
  if (!rest.before && !first) {
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
        parentCommentId: fromGlobalId(author).id,
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

  if (author) {
    filter = {
      authorId: fromGlobalId(author).id,
      state: COMMENT_STATE.active, // will be overwrite by sate in input if specified
      ...filter
    }
  }

  const comments = await commentService.find({
    sort,
    before,
    after,
    first,
    filter
  })

  const edges = comments.map((comment: { [key: string]: string }) => ({
    cursor: toGlobalId({ type: 'Comment', id: comment.id }),
    node: comment
  }))

  const range = await commentService.range(filter)

  const firstEdge = edges[0]
  const lastEdge = edges[edges.length - 1]

  console.log({ range, firstEdge, lastEdge })

  return {
    edges,
    totalCount: range.count,
    pageInfo: {
      startCursor: firstEdge ? firstEdge.cursor : '',
      endCursor: lastEdge ? lastEdge.cursor : '',
      hasPreviousPage: firstEdge
        ? parseInt(firstEdge.node.id, 10) > parseInt(range.min, 10)
        : false,
      hasNextPage: lastEdge
        ? parseInt(lastEdge.node.id, 10) < parseInt(range.max, 10)
        : false
    }
  }
}

export default resolver
