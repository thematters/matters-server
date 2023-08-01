import type { GQLArticleResolvers } from 'definitions'

import { NODE_TYPES } from 'common/enums'
import { fromGlobalId, toGlobalId } from 'common/utils'

const resolver: GQLArticleResolvers['comments'] = async (
  { articleId },
  { input: { sort, first, ...rest } },
  { dataSources: { atomService, commentService } }
) => {
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

  // handle filter
  const { id: targetTypeId } = await atomService.findFirst({
    table: 'entity_type',
    where: { table: 'article' },
  })
  let where = { targetId: articleId, targetTypeId } as { [key: string]: any }
  if (rest.filter) {
    const { parentComment, author, state } = rest.filter
    if (parentComment || parentComment === null) {
      where = {
        parentCommentId: parentComment ? fromGlobalId(parentComment).id : null,
        ...where,
      }
    }
    if (author) {
      where = {
        authorId: fromGlobalId(author).id,
        ...where,
      }
    }
    if (state) {
      where = {
        state,
        ...where,
      }
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
}

export default resolver
