import type { GQLArticleResolvers, Draft, Comment } from 'definitions'

import _last from 'lodash/last'

import { NODE_TYPES } from 'common/enums'
import { ServerError } from 'common/errors'
import { fromGlobalId, toGlobalId } from 'common/utils'

const resolver: GQLArticleResolvers['responses'] = async (
  { articleId },
  { input: { sort, first, ...restParams } },
  { dataSources: { articleService, commentService } }
) => {
  const order = sort === 'oldest' ? 'asc' : 'desc'

  // set default first as 10, and use null for querying all.
  if (!restParams.before && typeof first === 'undefined') {
    first = 8
  }

  let after
  let before
  if (restParams.after) {
    after = fromGlobalId(restParams.after)
  }
  if (restParams.before) {
    before = fromGlobalId(restParams.before)
  }

  // fetch order and range based on Collection and Comment
  const { includeAfter, includeBefore, articleOnly } = restParams
  const sources = await articleService.findResponses({
    id: articleId,
    order,
    after,
    before,
    first,
    includeAfter,
    includeBefore,
    articleOnly,
  })

  // fetch responses
  const items = await Promise.all(
    sources.map((source: { entityId: string; type: string }) => {
      switch (source.type) {
        case 'Article': {
          return articleService.draftLoader.load(
            source.entityId
          ) as Promise<Draft>
        }
        case 'Comment': {
          return commentService.loadById(source.entityId)
        }
        default: {
          throw new ServerError(`Unknown response type: ${source.type}`)
        }
      }
    })
  )

  // re-process edges
  const isDraft = (item: Draft | Comment): item is Draft => 'title' in item
  const edges = items.map((item) => {
    const type = isDraft(item) ? NODE_TYPES.Article : NODE_TYPES.Comment
    const id = isDraft(item) ? item.articleId : item.id

    return {
      cursor: toGlobalId({ type, id }),
      node: { __type: type, ...item } as any,
    }
  })

  // handle page info
  const head = sources[0]
  const headCursor = head && parseInt(head.createdAt, 10)

  const tail = _last(sources)
  const tailCursor = tail && parseInt(tail.createdAt, 10)

  const edgeHead = edges[0]
  const edgeTail = _last(edges)

  return {
    edges,
    totalCount: head.count,
    pageInfo: {
      startCursor: edgeHead ? edgeHead.cursor : '',
      endCursor: edgeTail ? edgeTail.cursor : '',
      hasPreviousPage:
        order === 'asc'
          ? headCursor > head.minCursor
          : headCursor < head.maxCursor,
      hasNextPage:
        order === 'asc'
          ? tailCursor < head.maxCursor
          : tailCursor > head.minCursor,
    },
  }
}

export default resolver
