import { COMMENT_STATE, COMMENT_TYPE, NODE_TYPES } from 'common/enums/index.js'
import {
  connectionFromArray, // fromConnectionArgs
  fromGlobalId,
  toGlobalId,
} from 'common/utils/index.js'
import { CircleToDiscussionResolver } from 'definitions'

const resolver: CircleToDiscussionResolver = async (
  { id, owner },
  { input: { sort, first, ...rest } },
  { viewer, dataSources: { atomService, paymentService, commentService } }
) => {
  if (!id || !viewer.id) {
    return connectionFromArray([], rest)
  }

  // resolve sort to order
  const order = sort === 'oldest' ? 'asc' : 'desc'

  const isCircleMember = await paymentService.isCircleMember({
    userId: viewer.id,
    circleId: id,
  })
  const isCircleOwner = viewer.id === owner

  if (!isCircleMember && !isCircleOwner) {
    return connectionFromArray([], rest)
  }

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
    type: COMMENT_TYPE.circleDiscussion,
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

  const edges = comments.map((comment: { [key: string]: string }) => ({
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
      orderBy: [{ column: 'created_at', order: 'desc' }],
    }),
  ])
  return connectionFromArray(comments, input, totalCount)
  */
}

export default resolver
