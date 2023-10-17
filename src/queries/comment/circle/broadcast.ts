import type { GQLCircleResolvers } from 'definitions'

import { COMMENT_STATE, COMMENT_TYPE, NODE_TYPES } from 'common/enums'
import {
  connectionFromArray, // fromConnectionArgs
  fromGlobalId,
  toGlobalId,
} from 'common/utils'

const resolver: GQLCircleResolvers['broadcast'] = async (
  { id },
  { input: { sort, first, ...rest } },
  { dataSources: { commentService } }
) => {
  if (!id) {
    return connectionFromArray([], rest)
  }

  // resolve sort to order
  const order = sort === 'oldest' ? 'asc' : 'desc'

  // set default for first in forward pagination. use null for query all.
  // TODO: use "last" for backward pagination
  if (!rest.before && typeof first === 'undefined') {
    first = 10
  }

  // handle pagination
  let before
  let after
  if (rest.after) {
    after = fromGlobalId(rest.after).id
  }
  if (rest.before) {
    before = fromGlobalId(rest.before).id
  }

  // const { take, skip } = fromConnectionArgs(input)

  const where: Record<string, string | null> = {
    state: COMMENT_STATE.active,
    parentCommentId: null,
    targetId: id,
    type: COMMENT_TYPE.circleBroadcast,
  }
  if (rest.filter) {
    const { parentComment, author, state } = rest.filter
    if (parentComment || parentComment === null) {
      where.parentCommentId = parentComment
        ? fromGlobalId(parentComment).id
        : null
    }
    if (author) {
      where.authorId = fromGlobalId(author).id
    }
    if (state) {
      where.state = state
    }
  }

  const [comments, range] = await Promise.all([
    commentService.find({
      sort,
      before,
      after,
      first,
      where,
      order,
      includeAfter: rest.includeAfter,
      includeBefore: rest.includeBefore,
    }),
    commentService.range(where),
  ])

  const edges = comments.map((comment) => ({
    cursor: toGlobalId({ type: NODE_TYPES.Comment, id: comment.id }),
    node: comment,
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
      hasNextPage: order === 'asc' ? lastId < range.max : lastId > range.min,
    },
  }

  /*
  const [totalCount, comments] = await Promise.all([
    atomService.count({
      table: 'comment',
      where,
    }),
    atomService.findMany({
      table: 'comment',
      where,
      skip,
      take,
      orderByRaw: `
        pinned DESC,
        CASE pinned
        WHEN true THEN
          pinned_at
        WHEN false THEN
          created_at
        END DESC
      `,
    }),
  ])

  return connectionFromArray(comments, input, totalCount)
  */
}

export default resolver
